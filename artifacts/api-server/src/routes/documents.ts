import { Router, type IRouter } from "express";
import { and, desc, eq, isNull, or } from "drizzle-orm";
import { db, documents } from "@workspace/db";
import {
  ListDocumentsResponse,
  CreateDocumentBody,
  GetDocumentParams,
  GetDocumentResponse,
  DeleteDocumentParams,
} from "@workspace/api-zod";
import { requireAuth } from "../lib/auth";
import { recordMemory } from "../lib/memory";

const router: IRouter = Router();

router.use(requireAuth);

function scope(uid: string) {
  return or(eq(documents.userId, uid), isNull(documents.userId));
}

router.get("/documents", async (req, res): Promise<void> => {
  const uid = req.userId!;
  const rows = await db
    .select()
    .from(documents)
    .where(scope(uid))
    .orderBy(desc(documents.createdAt));
  res.json(ListDocumentsResponse.parse(rows));
});

router.post("/documents", async (req, res): Promise<void> => {
  const parsed = CreateDocumentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const uid = req.userId!;
  const [doc] = await db
    .insert(documents)
    .values({ ...parsed.data, userId: uid })
    .returning();
  await recordMemory("document_added", `Added document "${doc.fileName}"`, uid);
  res.status(201).json(GetDocumentResponse.parse(doc));
});

router.get("/documents/:id", async (req, res): Promise<void> => {
  const params = GetDocumentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const uid = req.userId!;
  const [doc] = await db
    .select()
    .from(documents)
    .where(and(eq(documents.id, params.data.id), scope(uid)));
  if (!doc) {
    res.status(404).json({ error: "Document not found" });
    return;
  }
  res.json(GetDocumentResponse.parse(doc));
});

router.delete("/documents/:id", async (req, res): Promise<void> => {
  const params = DeleteDocumentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const uid = req.userId!;
  const [doc] = await db
    .delete(documents)
    .where(and(eq(documents.id, params.data.id), scope(uid)))
    .returning();
  if (!doc) {
    res.status(404).json({ error: "Document not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
