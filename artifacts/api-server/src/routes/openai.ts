import { Router, type IRouter } from "express";
import { and, asc, desc, eq } from "drizzle-orm";
import { db, conversations, messages } from "@workspace/db";
import { openai } from "@workspace/integrations-openai-ai-server";
import {
  ListOpenaiConversationsResponse,
  CreateOpenaiConversationBody,
  GetOpenaiConversationParams,
  GetOpenaiConversationResponse,
  DeleteOpenaiConversationParams,
  ListOpenaiMessagesParams,
  ListOpenaiMessagesResponse,
  SendOpenaiMessageParams,
  SendOpenaiMessageBody,
} from "@workspace/api-zod";
import { requireAuth } from "../lib/auth";
import { getKnowledgeCorpus } from "../lib/notes-context";

const router: IRouter = Router();

router.use(requireAuth);

const SYSTEM_PROMPT =
  "You are CortexOS X, an AI second-brain assistant. You help the user reason over their knowledge, think clearly, and make decisions. Be concise, insightful, and direct.";

router.get("/openai/conversations", async (req, res): Promise<void> => {
  const uid = req.userId!;
  const rows = await db
    .select()
    .from(conversations)
    .where(eq(conversations.userId, uid))
    .orderBy(desc(conversations.createdAt));
  res.json(ListOpenaiConversationsResponse.parse(rows));
});

router.post("/openai/conversations", async (req, res): Promise<void> => {
  const uid = req.userId!;
  const parsed = CreateOpenaiConversationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [conversation] = await db
    .insert(conversations)
    .values({ title: parsed.data.title || "New conversation", userId: uid })
    .returning();
  res.status(201).json(
    GetOpenaiConversationResponse.parse({ ...conversation, messages: [] }),
  );
});

router.get("/openai/conversations/:id", async (req, res): Promise<void> => {
  const uid = req.userId!;
  const params = GetOpenaiConversationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [conversation] = await db
    .select()
    .from(conversations)
    .where(and(eq(conversations.id, params.data.id), eq(conversations.userId, uid)));
  if (!conversation) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }
  const msgs = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, params.data.id))
    .orderBy(asc(messages.createdAt));
  res.json(GetOpenaiConversationResponse.parse({ ...conversation, messages: msgs }));
});

router.delete("/openai/conversations/:id", async (req, res): Promise<void> => {
  const uid = req.userId!;
  const params = DeleteOpenaiConversationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [conversation] = await db
    .delete(conversations)
    .where(and(eq(conversations.id, params.data.id), eq(conversations.userId, uid)))
    .returning();
  if (!conversation) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }
  res.sendStatus(204);
});

router.get(
  "/openai/conversations/:id/messages",
  async (req, res): Promise<void> => {
    const uid = req.userId!;
    const params = ListOpenaiMessagesParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const [conversation] = await db
      .select()
      .from(conversations)
      .where(
        and(eq(conversations.id, params.data.id), eq(conversations.userId, uid)),
      );
    if (!conversation) {
      res.status(404).json({ error: "Conversation not found" });
      return;
    }
    const msgs = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, params.data.id))
      .orderBy(asc(messages.createdAt));
    res.json(ListOpenaiMessagesResponse.parse(msgs));
  },
);

router.post(
  "/openai/conversations/:id/messages",
  async (req, res): Promise<void> => {
    const params = SendOpenaiMessageParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const parsed = SendOpenaiMessageBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const uid = req.userId!;
    const [conversation] = await db
      .select()
      .from(conversations)
      .where(
        and(eq(conversations.id, params.data.id), eq(conversations.userId, uid)),
      );
    if (!conversation) {
      res.status(404).json({ error: "Conversation not found" });
      return;
    }

    // Persist the user message.
    await db.insert(messages).values({
      conversationId: params.data.id,
      role: "user",
      content: parsed.data.content,
    });

    // Title the conversation from the first user message.
    if (conversation.title === "New conversation") {
      await db
        .update(conversations)
        .set({ title: parsed.data.content.slice(0, 60) })
        .where(eq(conversations.id, params.data.id));
    }

    const history = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, params.data.id))
      .orderBy(asc(messages.createdAt));

    const corpus = await getKnowledgeCorpus(uid);
    const systemPrompt = corpus
      ? `${SYSTEM_PROMPT}\n\nThe following is the user's knowledge base — their notes, documents, and projects. Ground your answers in it whenever relevant, and cite the source title where useful. If the requested information is not present in the knowledge base, say so clearly before answering from general knowledge:\n${corpus}`
      : SYSTEM_PROMPT;

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders?.();

    let assistantText = "";
    try {
      const stream = await openai.chat.completions.create({
        model: "qwen3:8b",
        max_completion_tokens: 1024,
        stream: true,
        messages: [
          { role: "system", content: systemPrompt },
          ...history.map((m) => ({
            role: m.role as "user" | "assistant",
            content: m.content,
          })),
        ],
      });

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content ?? "";
        if (delta) {
          assistantText += delta;
          res.write(`data: ${JSON.stringify({ content: delta })}\n\n`);
        }
      }
    } catch (err) {
      req.log.error({ err }, "Chat stream failed");
      res.write(
        `data: ${JSON.stringify({ error: "Failed to generate response" })}\n\n`,
      );
    }

    if (assistantText) {
      await db.insert(messages).values({
        conversationId: params.data.id,
        role: "assistant",
        content: assistantText,
      });
    }

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  },
);

export default router;
