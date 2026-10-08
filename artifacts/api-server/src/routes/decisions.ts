import { Router, type IRouter } from "express";
import { and, desc, eq, isNull, or } from "drizzle-orm";
import { db, decisions } from "@workspace/db";
import {
  ListDecisionsResponse,
  SimulateDecisionBody,
  SimulateDecisionResponse,
  DeleteDecisionParams,
} from "@workspace/api-zod";
import { requireAuth } from "../lib/auth";
import { aiJSON } from "../lib/ai";
import { recordMemory } from "../lib/memory";
import { getNotesCorpus } from "../lib/notes-context";

const router: IRouter = Router();

router.use(requireAuth);

function scope(uid: string) {
  return or(eq(decisions.userId, uid), isNull(decisions.userId));
}

interface DecisionAnalysis {
  pros: string[];
  cons: string[];
  risks: string[];
  opportunities: string[];
  confidence: number;
  successProbability: number;
  prediction: string;
  recommendedAction: string;
}

router.get("/decisions", async (req, res): Promise<void> => {
  const uid = req.userId!;
  const rows = await db
    .select()
    .from(decisions)
    .where(scope(uid))
    .orderBy(desc(decisions.createdAt));
  res.json(ListDecisionsResponse.parse(rows));
});

router.post("/decisions/simulate", async (req, res): Promise<void> => {
  const parsed = SimulateDecisionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const uid = req.userId!;
  const corpus = await getNotesCorpus(uid);
  const analysis = await aiJSON<DecisionAnalysis>(
    `You are a decision simulation engine grounded in the user's knowledge base. Use the provided notes as context where relevant. Analyze the decision and return JSON with exactly these keys:
"pros" (array of strings), "cons" (array of strings), "risks" (array of strings), "opportunities" (array of strings),
"confidence" (integer 0-100 — how confident you are in this analysis),
"successProbability" (integer 0-100 — likelihood of a positive outcome),
"prediction" (string — a concise predicted outcome),
"recommendedAction" (string — your recommended next step).`,
    `Decision to simulate: ${parsed.data.question}\n\n${corpus ? `User's notes:\n${corpus}` : "No notes available."}`,
  );
  const [decision] = await db
    .insert(decisions)
    .values({
      question: parsed.data.question,
      pros: analysis.pros ?? [],
      cons: analysis.cons ?? [],
      risks: analysis.risks ?? [],
      opportunities: analysis.opportunities ?? [],
      confidence: Math.round(analysis.confidence ?? 0),
      successProbability: Math.round(analysis.successProbability ?? 0),
      prediction: analysis.prediction ?? "",
      recommendedAction: analysis.recommendedAction ?? "",
      userId: uid,
    })
    .returning();
  await recordMemory(
    "decision_simulated",
    `Simulated decision "${decision.question}"`,
    uid,
  );
  res.status(201).json(SimulateDecisionResponse.parse(decision));
});

router.delete("/decisions/:id", async (req, res): Promise<void> => {
  const params = DeleteDecisionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const uid = req.userId!;
  const [decision] = await db
    .delete(decisions)
    .where(and(eq(decisions.id, params.data.id), scope(uid)))
    .returning();
  if (!decision) {
    res.status(404).json({ error: "Decision not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
