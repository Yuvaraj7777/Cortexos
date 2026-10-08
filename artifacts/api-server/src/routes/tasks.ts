import { Router, type IRouter } from "express";
import { and, desc, eq, isNull, or } from "drizzle-orm";
import { db, tasks } from "@workspace/db";
import {
  ListTasksQueryParams,
  ListTasksResponse,
  CreateTaskBody,
  UpdateTaskParams,
  UpdateTaskBody,
  UpdateTaskResponse,
  DeleteTaskParams,
} from "@workspace/api-zod";
import { requireAuth } from "../lib/auth";
import { recordMemory } from "../lib/memory";

const router: IRouter = Router();

router.use(requireAuth);

function scope(uid: string) {
  return or(eq(tasks.userId, uid), isNull(tasks.userId));
}

function serialize(row: typeof tasks.$inferSelect) {
  return {
    ...row,
    dueDate: row.dueDate ? new Date(row.dueDate).toISOString() : null,
  };
}

router.get("/tasks", async (req, res): Promise<void> => {
  const query = ListTasksQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }
  const uid = req.userId!;
  const conditions = [scope(uid)];
  if (query.data.status) {
    conditions.push(eq(tasks.status, query.data.status));
  }
  if (query.data.projectId !== undefined) {
    conditions.push(eq(tasks.projectId, query.data.projectId));
  }
  const rows = await db
    .select()
    .from(tasks)
    .where(and(...conditions))
    .orderBy(desc(tasks.createdAt));
  res.json(ListTasksResponse.parse(rows.map(serialize)));
});

router.post("/tasks", async (req, res): Promise<void> => {
  const parsed = CreateTaskBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const uid = req.userId!;
  const { dueDate, ...rest } = parsed.data;
  const [task] = await db
    .insert(tasks)
    .values({
      ...rest,
      dueDate: dueDate ? new Date(dueDate) : null,
      userId: uid,
    })
    .returning();
  await recordMemory("task_created", `Created task "${task.title}"`, uid);
  res.status(201).json(UpdateTaskResponse.parse(serialize(task)));
});

router.patch("/tasks/:id", async (req, res): Promise<void> => {
  const params = UpdateTaskParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateTaskBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const uid = req.userId!;
  const { dueDate, ...rest } = parsed.data;
  const [task] = await db
    .update(tasks)
    .set({
      ...rest,
      ...(dueDate !== undefined
        ? { dueDate: dueDate ? new Date(dueDate) : null }
        : {}),
      updatedAt: new Date(),
    })
    .where(and(eq(tasks.id, params.data.id), scope(uid)))
    .returning();
  if (!task) {
    res.status(404).json({ error: "Task not found" });
    return;
  }
  res.json(UpdateTaskResponse.parse(serialize(task)));
});

router.delete("/tasks/:id", async (req, res): Promise<void> => {
  const params = DeleteTaskParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const uid = req.userId!;
  const [task] = await db
    .delete(tasks)
    .where(and(eq(tasks.id, params.data.id), scope(uid)))
    .returning();
  if (!task) {
    res.status(404).json({ error: "Task not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
