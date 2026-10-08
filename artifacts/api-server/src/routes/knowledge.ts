import { Router, type IRouter } from "express";
import { eq, isNull, or } from "drizzle-orm";
import {
  db,
  notes,
  documents,
  contradictions,
  graphEdges,
} from "@workspace/db";
import { GetKnowledgeHealthResponse } from "@workspace/api-zod";
import { requireAuth } from "../lib/auth";
import { aiJSON } from "../lib/ai";

const router: IRouter = Router();

router.use(requireAuth);

interface HealthQualitative {
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
}

router.get("/analytics/knowledge-health", async (req, res): Promise<void> => {
  const uid = req.userId!;
  const [noteRows, docRows, contradictionRows, edgeRows] = await Promise.all([
    db.select().from(notes).where(or(eq(notes.userId, uid), isNull(notes.userId))),
    db
      .select()
      .from(documents)
      .where(or(eq(documents.userId, uid), isNull(documents.userId))),
    db
      .select()
      .from(contradictions)
      .where(or(eq(contradictions.userId, uid), isNull(contradictions.userId))),
    db
      .select()
      .from(graphEdges)
      .where(or(eq(graphEdges.userId, uid), isNull(graphEdges.userId))),
  ]);

  const totalNotes = noteRows.length;

  // Coverage: how much content exists (notes + documents), capped.
  const coverage = Math.min(100, Math.round(((totalNotes + docRows.length) / 20) * 100));

  // Consistency: penalised by contradictions relative to notes.
  const consistency =
    totalNotes === 0
      ? 100
      : Math.max(0, Math.round(100 - (contradictionRows.length / totalNotes) * 100));

  // Freshness: share of notes updated in the last 30 days.
  const monthAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const freshNotes = noteRows.filter(
    (n) => new Date(n.updatedAt).getTime() >= monthAgo,
  ).length;
  const freshness = totalNotes === 0 ? 0 : Math.round((freshNotes / totalNotes) * 100);

  // Connectivity: graph edges relative to notes.
  const connectivity =
    totalNotes === 0
      ? 0
      : Math.min(100, Math.round((edgeRows.length / totalNotes) * 50));

  const score = Math.round((coverage + consistency + freshness + connectivity) / 4);

  let qualitative: HealthQualitative = {
    strengths: [],
    weaknesses: [],
    suggestions: [],
  };
  try {
    qualitative = await Promise.race([
      aiJSON<HealthQualitative>(
        `You are a knowledge base health analyst. Given the metrics, return JSON with:
"strengths" (array of 2-4 short strings), "weaknesses" (array of 2-4 short strings), "suggestions" (array of 3-5 actionable short strings).`,
        `Metrics — score:${score}, coverage:${coverage}, consistency:${consistency}, freshness:${freshness}, connectivity:${connectivity}, notes:${totalNotes}, documents:${docRows.length}, contradictions:${contradictionRows.length}, graphEdges:${edgeRows.length}.`,
      ),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("AI timeout")), 5000),
      ),
    ]);
  } catch {
    qualitative = {
      strengths: totalNotes > 0 ? ["Active knowledge capture"] : [],
      weaknesses: contradictionRows.length > 0 ? ["Unresolved contradictions"] : [],
      suggestions: ["Add more notes", "Rebuild the knowledge graph", "Run a contradiction scan"],
    };
  }

  res.json(
    GetKnowledgeHealthResponse.parse({
      score,
      coverage,
      consistency,
      freshness,
      connectivity,
      strengths: qualitative.strengths ?? [],
      weaknesses: qualitative.weaknesses ?? [],
      suggestions: qualitative.suggestions ?? [],
    }),
  );
});

export default router;
