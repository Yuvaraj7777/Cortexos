import { Router, type IRouter } from "express";
import { and, desc, eq, isNull, or } from "drizzle-orm";
import { db, notes, researchRuns } from "@workspace/db";
import {
  ResearchQueryBody,
  ResearchQueryResponse,
  ListResearchRunsResponse,
  DeleteResearchRunParams,
} from "@workspace/api-zod";
import { requireAuth } from "../lib/auth";
import { aiJSON } from "../lib/ai";
import { recordMemory } from "../lib/memory";

const router: IRouter = Router();

router.use(requireAuth);

// History runs are strictly private to their owner (like conversations), never shared via NULL userId.
function scope(uid: string) {
  return eq(researchRuns.userId, uid);
}

interface ResearchResult {
  answer: string;
  insights: string[];
  relatedNoteIds: number[];
}

router.get("/research/runs", async (req, res): Promise<void> => {
  const uid = req.userId!;
  const rows = await db
    .select()
    .from(researchRuns)
    .where(scope(uid))
    .orderBy(desc(researchRuns.createdAt));
  res.json(ListResearchRunsResponse.parse(rows));
});

router.delete("/research/runs/:id", async (req, res): Promise<void> => {
  const params = DeleteResearchRunParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const uid = req.userId!;
  const [row] = await db
    .delete(researchRuns)
    .where(and(eq(researchRuns.id, params.data.id), scope(uid)))
    .returning();
  if (!row) {
    res.status(404).json({ error: "Research run not found" });
    return;
  }
  res.sendStatus(204);
});

router.post("/research/query", async (req, res): Promise<void> => {
  const parsed = ResearchQueryBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const uid = req.userId!;
  const includeNotes = parsed.data.includeNotes ?? true;

  const noteRows = includeNotes
    ? await db
        .select()
        .from(notes)
        .where(or(eq(notes.userId, uid), isNull(notes.userId)))
    : [];

  const corpus = noteRows
    .map((n) => `[id:${n.id}] "${n.title}": ${n.content}`)
    .join("\n");

  const result = await aiJSON<ResearchResult>(
    `You are a research copilot performing retrieval-augmented analysis over the user's knowledge base.
Answer the query using the provided notes where relevant, and your own knowledge otherwise.
Return JSON with:
"answer" (string — a thorough, well-structured answer),
"insights" (array of 3-5 short strings — key takeaways),
"relatedNoteIds" (array of numbers — ids of notes that informed the answer, may be empty).`,
    `Query: ${parsed.data.query}\n\n${corpus ? `Notes:\n${corpus}` : "No notes available."}`,
  );

  const relatedIds = new Set(result.relatedNoteIds ?? []);
  const relatedNotes = noteRows.filter((n) => relatedIds.has(n.id));

  const sources = relatedNotes.slice(0, 5).map((n) => ({
    title: n.title,
    excerpt: n.content.slice(0, 200),
    relevance: 0.9,
  }));

  const answer = result.answer ?? "";
  const insights = result.insights ?? [];

  await db.insert(researchRuns).values({
    query: parsed.data.query,
    answer,
    insights,
    sources,
    userId: uid,
  });

  await recordMemory("research_query", `Researched "${parsed.data.query}"`, uid);

  res.json(
    ResearchQueryResponse.parse({
      answer,
      sources,
      insights,
      relatedNotes,
    }),
  );
});

export default router;
