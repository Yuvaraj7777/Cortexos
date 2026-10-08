import { Router, type IRouter } from "express";
import { and, desc, eq, ilike, isNull, or, sql } from "drizzle-orm";
import { db, notes } from "@workspace/db";
import {
  ListNotesQueryParams,
  ListNotesResponse,
  CreateNoteBody,
  GetNoteParams,
  GetNoteResponse,
  UpdateNoteParams,
  UpdateNoteBody,
  UpdateNoteResponse,
  DeleteNoteParams,
  SummarizeNoteParams,
  SummarizeNoteResponse,
  GetNoteStatsResponse,
} from "@workspace/api-zod";
import { requireAuth } from "../lib/auth";
import { aiText } from "../lib/ai";
import { recordMemory } from "../lib/memory";

const router: IRouter = Router();

router.use(requireAuth);

function scope(uid: string) {
  return or(eq(notes.userId, uid), isNull(notes.userId));
}

router.get("/notes", async (req, res): Promise<void> => {
  const query = ListNotesQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }
  const uid = req.userId!;
  const conditions = [scope(uid)];
  if (query.data.search) {
    conditions.push(
      or(
        ilike(notes.title, `%${query.data.search}%`),
        ilike(notes.content, `%${query.data.search}%`),
      ),
    );
  }
  if (query.data.tag) {
    conditions.push(sql`${notes.tags} ? ${query.data.tag}`);
  }
  const rows = await db
    .select()
    .from(notes)
    .where(and(...conditions))
    .orderBy(desc(notes.updatedAt));
  res.json(ListNotesResponse.parse(rows));
});

router.get("/notes/stats", async (req, res): Promise<void> => {
  const uid = req.userId!;
  const rows = await db.select().from(notes).where(scope(uid));
  const tagCounts = new Map<string, number>();
  for (const note of rows) {
    for (const tag of note.tags ?? []) {
      tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
    }
  }
  const byTag = [...tagCounts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count);
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const recentCount = rows.filter(
    (n) => new Date(n.createdAt).getTime() >= weekAgo,
  ).length;
  res.json(
    GetNoteStatsResponse.parse({
      total: rows.length,
      byTag,
      recentCount,
      topTags: byTag.slice(0, 5).map((t) => t.tag),
    }),
  );
});

router.post("/notes", async (req, res): Promise<void> => {
  const parsed = CreateNoteBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const uid = req.userId!;
  const [note] = await db
    .insert(notes)
    .values({
      title: parsed.data.title,
      content: parsed.data.content,
      tags: parsed.data.tags ?? [],
      userId: uid,
    })
    .returning();
  await recordMemory("note_created", `Created note "${note.title}"`, uid);
  res.status(201).json(GetNoteResponse.parse(note));
});

router.get("/notes/:id", async (req, res): Promise<void> => {
  const params = GetNoteParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const uid = req.userId!;
  const [note] = await db
    .select()
    .from(notes)
    .where(and(eq(notes.id, params.data.id), scope(uid)));
  if (!note) {
    res.status(404).json({ error: "Note not found" });
    return;
  }
  res.json(GetNoteResponse.parse(note));
});

router.patch("/notes/:id", async (req, res): Promise<void> => {
  const params = UpdateNoteParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateNoteBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const uid = req.userId!;
  const [note] = await db
    .update(notes)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(and(eq(notes.id, params.data.id), scope(uid)))
    .returning();
  if (!note) {
    res.status(404).json({ error: "Note not found" });
    return;
  }
  res.json(UpdateNoteResponse.parse(note));
});

router.delete("/notes/:id", async (req, res): Promise<void> => {
  const params = DeleteNoteParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const uid = req.userId!;
  const [note] = await db
    .delete(notes)
    .where(and(eq(notes.id, params.data.id), scope(uid)))
    .returning();
  if (!note) {
    res.status(404).json({ error: "Note not found" });
    return;
  }
  res.sendStatus(204);
});

router.post("/notes/:id/summarize", async (req, res): Promise<void> => {
  const params = SummarizeNoteParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const uid = req.userId!;
  const [note] = await db
    .select()
    .from(notes)
    .where(and(eq(notes.id, params.data.id), scope(uid)));
  if (!note) {
    res.status(404).json({ error: "Note not found" });
    return;
  }
  const summary = await aiText(
    "You are a precise knowledge assistant. Summarize the note in 2-3 sentences capturing the key ideas.",
    `Title: ${note.title}\n\nContent:\n${note.content}`,
  );
  await db
    .update(notes)
    .set({ summary, updatedAt: new Date() })
    .where(eq(notes.id, note.id));
  await recordMemory("note_summarized", `Summarized note "${note.title}"`, uid);
  res.json(SummarizeNoteResponse.parse({ summary, title: note.title }));
});

export default router;
