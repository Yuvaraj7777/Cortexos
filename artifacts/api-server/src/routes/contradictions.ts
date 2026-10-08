import { Router, type IRouter } from "express";
import { desc, eq, isNull, or } from "drizzle-orm";
import { db, contradictions, notes } from "@workspace/db";
import {
  ListContradictionsResponse,
  DetectContradictionsResponse,
  DetectContradictionsBody,
} from "@workspace/api-zod";
import { requireAuth } from "../lib/auth";
import { aiJSON } from "../lib/ai";
import { recordMemory } from "../lib/memory";

const router: IRouter = Router();

router.use(requireAuth);

interface DetectedContradiction {
  noteATitle: string;
  noteBTitle: string;
  explanation: string;
  confidence: number;
}

router.get("/contradictions", async (req, res): Promise<void> => {
  const uid = req.userId!;
  const rows = await db
    .select()
    .from(contradictions)
    .where(or(eq(contradictions.userId, uid), isNull(contradictions.userId)))
    .orderBy(desc(contradictions.createdAt));
  res.json(ListContradictionsResponse.parse(rows));
});

router.post("/contradictions/detect", async (req, res): Promise<void> => {
  const uid = req.userId!;
  const parsed = DetectContradictionsBody.safeParse(req.body ?? {});
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }
  const claim = parsed.data.claim?.trim() ?? "";

  const noteRows = await db
    .select()
    .from(notes)
    .where(or(eq(notes.userId, uid), isNull(notes.userId)));

  // With a typed claim we need at least one note to compare against;
  // a full cross-check needs at least two notes.
  const minNotes = claim ? 1 : 2;
  if (noteRows.length < minNotes) {
    res.json(DetectContradictionsResponse.parse({ found: 0, contradictions: [] }));
    return;
  }

  const corpus = noteRows
    .map((n) => `- "${n.title}": ${n.content}`)
    .join("\n");

  const sensitivity = `Be highly sensitive: flag not only direct logical contradictions but also SUBTLE conflicts — small variations in stated facts, numbers, dates, or names; differences in degree, tone, or emphasis; partial or implied disagreements; and claims that are mostly aligned but differ in one meaningful detail. When two statements are similar but not fully consistent, report the conflict and use a lower confidence (e.g. 30-60) to reflect that it is a minor or partial contradiction. Reserve high confidence (75-100) for clear, direct contradictions.`;

  const system = claim
    ? `You are a contradiction detection engine for a knowledge base. The user proposes a statement. Compare it against their notes and identify which notes conflict with the statement, including subtle or partial conflicts.
${sensitivity}
Return JSON with key "contradictions" — an array of objects each with:
"noteATitle" (string, always exactly "Proposed statement"), "noteBTitle" (string, exact title of the conflicting note),
"explanation" (string, why the note conflicts with the statement), "confidence" (integer 0-100).
If nothing conflicts at all, return an empty array.`
    : `You are a contradiction detection engine for a knowledge base. Examine the user's notes and identify pairs of notes that contain conflicting claims, beliefs, or statements, including subtle or partial conflicts.
${sensitivity}
Return JSON with key "contradictions" — an array of objects each with:
"noteATitle" (string, exact title of the first note), "noteBTitle" (string, exact title of the second note),
"explanation" (string, why they conflict), "confidence" (integer 0-100).
If nothing conflicts at all, return an empty array.`;

  const user = claim
    ? `Proposed statement: "${claim}"\n\nNotes:\n${corpus}`
    : `Notes:\n${corpus}`;

  const result = await aiJSON<{ contradictions: DetectedContradiction[] }>(
    system,
    user,
  );

  const detected = (result.contradictions ?? []).filter(
    (c) => c.noteATitle && c.noteBTitle,
  );

  // Clear previous user-scoped detections before storing the fresh run.
  await db.delete(contradictions).where(eq(contradictions.userId, uid));

  let inserted: typeof contradictions.$inferSelect[] = [];
  if (detected.length > 0) {
    inserted = await db
      .insert(contradictions)
      .values(
        detected.map((c) => ({
          noteATitle: c.noteATitle,
          noteBTitle: c.noteBTitle,
          explanation: c.explanation ?? "",
          confidence: Math.round(c.confidence ?? 0),
          userId: uid,
        })),
      )
      .returning();
  }

  await recordMemory(
    "contradiction_scan",
    `Ran contradiction scan — found ${inserted.length}`,
    uid,
  );

  res.json(
    DetectContradictionsResponse.parse({
      found: inserted.length,
      contradictions: inserted,
    }),
  );
});

export default router;
