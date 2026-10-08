import { Router, type IRouter } from "express";
import { and, desc, eq } from "drizzle-orm";
import { db, reasoningRuns } from "@workspace/db";
import {
  MultiAgentReasonBody,
  MultiAgentReasonResponse,
  ListReasoningRunsResponse,
  DeleteReasoningRunParams,
} from "@workspace/api-zod";
import { requireAuth } from "../lib/auth";
import { aiJSON } from "../lib/ai";
import { recordMemory } from "../lib/memory";
import { getNotesCorpus } from "../lib/notes-context";

const router: IRouter = Router();

router.use(requireAuth);

// History runs are strictly private to their owner (like conversations), never shared via NULL userId.
function scope(uid: string) {
  return eq(reasoningRuns.userId, uid);
}

interface AgentPanel {
  optimist: string;
  critic: string;
  strategist: string;
  scientist: string;
  devilsAdvocate: string;
  synthesis: string;
  confidences: {
    optimist: number;
    critic: number;
    strategist: number;
    scientist: number;
    devilsAdvocate: number;
  };
  recommendation: string;
  confidence: number;
  keyRisks: string[];
  nextSteps: string[];
}

function clampPct(n: unknown): number {
  const v = typeof n === "number" ? n : 0;
  return Math.max(0, Math.min(100, Math.round(v)));
}

function toStringArray(v: unknown): string[] {
  return Array.isArray(v)
    ? v.filter((x): x is string => typeof x === "string")
    : [];
}

// Normalize rows for the contract: legacy/partial rows may have an empty
// `confidences` object or missing fields, which would fail the (now required)
// response schema. Fill safe defaults so old history still validates.
function normalizeRun<T extends Record<string, unknown>>(row: T) {
  const c = (row.confidences ?? {}) as Record<string, unknown>;
  return {
    ...row,
    confidences: {
      optimist: clampPct(c.optimist),
      critic: clampPct(c.critic),
      strategist: clampPct(c.strategist),
      scientist: clampPct(c.scientist),
      devilsAdvocate: clampPct(c.devilsAdvocate),
    },
    confidence: clampPct(row.confidence),
    recommendation:
      typeof row.recommendation === "string" ? row.recommendation : "",
    keyRisks: toStringArray(row.keyRisks),
    nextSteps: toStringArray(row.nextSteps),
  };
}

router.get("/research/multi-agent/runs", async (req, res): Promise<void> => {
  const uid = req.userId!;
  const rows = await db
    .select()
    .from(reasoningRuns)
    .where(scope(uid))
    .orderBy(desc(reasoningRuns.createdAt));
  res.json(ListReasoningRunsResponse.parse(rows.map(normalizeRun)));
});

router.delete(
  "/research/multi-agent/runs/:id",
  async (req, res): Promise<void> => {
    const params = DeleteReasoningRunParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const uid = req.userId!;
    const [row] = await db
      .delete(reasoningRuns)
      .where(and(eq(reasoningRuns.id, params.data.id), scope(uid)))
      .returning();
    if (!row) {
      res.status(404).json({ error: "Reasoning run not found" });
      return;
    }
    res.sendStatus(204);
  },
);

router.post("/research/multi-agent", async (req, res): Promise<void> => {
  const parsed = MultiAgentReasonBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const uid = req.userId!;

  const corpus = await getNotesCorpus(uid);

  const panel = await aiJSON<AgentPanel>(
    `You orchestrate a panel of six AI reasoning agents analyzing a question, grounded in the user's knowledge base. Use the provided notes as context where relevant. Each agent gives its distinct perspective, rates its own confidence, then a final synthesis integrates them into an actionable recommendation.
Return JSON with these exact keys:
"optimist" (paragraph: upside, possibilities, best-case outcomes),
"critic" (paragraph: rigorously challenges assumptions and flaws),
"strategist" (paragraph: long-term planning, positioning, tradeoffs),
"scientist" (paragraph: evidence, data, testable hypotheses, first principles),
"devilsAdvocate" (paragraph: argues the contrarian opposite position),
"synthesis" (paragraph: balanced integration of all perspectives),
"confidences" (object with integer keys 0-100: "optimist","critic","strategist","scientist","devilsAdvocate" — how strongly each agent believes its own case),
"recommendation" (one or two sentences: the single clearest recommended course of action),
"confidence" (integer 0-100: overall confidence in the recommendation),
"keyRisks" (array of 2-4 short strings: the most important risks or unknowns),
"nextSteps" (array of 2-4 short strings: concrete next actions).`,
    `Question: ${parsed.data.query}\n\n${corpus ? `User's notes:\n${corpus}` : "No notes available."}`,
  );

  const confidences = {
    optimist: clampPct(panel.confidences?.optimist),
    critic: clampPct(panel.confidences?.critic),
    strategist: clampPct(panel.confidences?.strategist),
    scientist: clampPct(panel.confidences?.scientist),
    devilsAdvocate: clampPct(panel.confidences?.devilsAdvocate),
  };

  const values = {
    query: parsed.data.query,
    optimist: panel.optimist ?? "",
    critic: panel.critic ?? "",
    strategist: panel.strategist ?? "",
    scientist: panel.scientist ?? "",
    devilsAdvocate: panel.devilsAdvocate ?? "",
    synthesis: panel.synthesis ?? "",
    confidences,
    recommendation:
      typeof panel.recommendation === "string" ? panel.recommendation : "",
    confidence: clampPct(panel.confidence),
    keyRisks: toStringArray(panel.keyRisks),
    nextSteps: toStringArray(panel.nextSteps),
  };

  await db.insert(reasoningRuns).values({ ...values, userId: uid });

  await recordMemory(
    "multi_agent_reasoning",
    `Reasoned about "${parsed.data.query}"`,
    uid,
  );

  res.json(MultiAgentReasonResponse.parse({ ...values, createdAt: new Date() }));
});

export default router;
