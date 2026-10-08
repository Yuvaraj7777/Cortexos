import { Router, type IRouter } from "express";
import { desc, eq, isNull, or } from "drizzle-orm";
import {
  db,
  memoryEntries,
  notes,
  documents,
  decisions,
  contradictions,
  projects,
  tasks,
} from "@workspace/db";
import { ListMemoryResponse, GetTimelineResponse } from "@workspace/api-zod";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();

router.use(requireAuth);

router.get("/memory", async (req, res): Promise<void> => {
  const uid = req.userId!;
  const rows = await db
    .select()
    .from(memoryEntries)
    .where(or(eq(memoryEntries.userId, uid), isNull(memoryEntries.userId)))
    .orderBy(desc(memoryEntries.createdAt));
  res.json(ListMemoryResponse.parse(rows));
});

router.get("/memory/timeline", async (req, res): Promise<void> => {
  const uid = req.userId!;

  const [noteRows, docRows, decisionRows, contradictionRows, projectRows, taskRows] =
    await Promise.all([
      db.select().from(notes).where(or(eq(notes.userId, uid), isNull(notes.userId))),
      db
        .select()
        .from(documents)
        .where(or(eq(documents.userId, uid), isNull(documents.userId))),
      db
        .select()
        .from(decisions)
        .where(or(eq(decisions.userId, uid), isNull(decisions.userId))),
      db
        .select()
        .from(contradictions)
        .where(or(eq(contradictions.userId, uid), isNull(contradictions.userId))),
      db
        .select()
        .from(projects)
        .where(or(eq(projects.userId, uid), isNull(projects.userId))),
      db.select().from(tasks).where(or(eq(tasks.userId, uid), isNull(tasks.userId))),
    ]);

  const items = [
    ...noteRows.map((n) => ({
      id: `note-${n.id}`,
      type: "note",
      title: n.title,
      description: n.summary ?? n.content.slice(0, 140),
      timestamp: n.createdAt,
    })),
    ...docRows.map((d) => ({
      id: `document-${d.id}`,
      type: "document",
      title: d.fileName,
      description: `${d.fileType} document`,
      timestamp: d.createdAt,
    })),
    ...decisionRows.map((d) => ({
      id: `decision-${d.id}`,
      type: "decision",
      title: d.question,
      description: d.recommendedAction || d.prediction,
      timestamp: d.createdAt,
    })),
    ...contradictionRows.map((c) => ({
      id: `contradiction-${c.id}`,
      type: "contradiction",
      title: `${c.noteATitle} vs ${c.noteBTitle}`,
      description: c.explanation,
      timestamp: c.createdAt,
    })),
    ...projectRows.map((p) => ({
      id: `project-${p.id}`,
      type: "project",
      title: p.name,
      description: p.description ?? "",
      timestamp: p.createdAt,
    })),
    ...taskRows.map((t) => ({
      id: `task-${t.id}`,
      type: "task",
      title: t.title,
      description: t.description ?? "",
      timestamp: t.createdAt,
    })),
  ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  res.json(GetTimelineResponse.parse(items));
});

export default router;
