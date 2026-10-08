import { Router, type IRouter } from "express";
import { and, eq, isNull, or } from "drizzle-orm";
import {
  db,
  notes,
  documents,
  projects,
  tasks,
  decisions,
  contradictions,
  messages,
  conversations,
} from "@workspace/db";
import { GetAnalyticsDashboardResponse } from "@workspace/api-zod";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();

router.use(requireAuth);

function dayKey(d: Date): string {
  return new Date(d).toISOString().slice(0, 10);
}

const STOPWORDS = new Set([
  "the", "and", "for", "are", "but", "not", "you", "all", "any", "can", "had",
  "her", "was", "one", "our", "out", "his", "has", "him", "how", "its", "may",
  "new", "now", "old", "see", "two", "way", "who", "did", "get", "use", "this",
  "that", "with", "from", "they", "have", "your", "will", "what", "when", "which",
  "their", "there", "would", "could", "about", "into", "than", "then", "them",
  "these", "those", "such", "also", "been", "more", "most", "some", "very",
  "just", "like", "over", "only", "much", "many", "each", "between", "during",
  "uses", "using", "used", "test", "note", "notes", "created", "automated",
  "testing", "principles", "field", "advanced", "studies", "branch", "relationship",
]);

function extractKeywords(text: string): string[] {
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 4 && !STOPWORDS.has(w) && !/^\d+$/.test(w));

  return [...new Set(words)];
}

router.get("/analytics/dashboard", async (req, res): Promise<void> => {
  const uid = req.userId!;
  const [noteRows, docRows, projectRows, taskRows, decisionRows, contradictionRows, messageRows] =
    await Promise.all([
      db.select().from(notes).where(or(eq(notes.userId, uid), isNull(notes.userId))),
      db
        .select()
        .from(documents)
        .where(or(eq(documents.userId, uid), isNull(documents.userId))),
      db
        .select()
        .from(projects)
        .where(or(eq(projects.userId, uid), isNull(projects.userId))),
      db.select().from(tasks).where(or(eq(tasks.userId, uid), isNull(tasks.userId))),
      db
        .select()
        .from(decisions)
        .where(or(eq(decisions.userId, uid), isNull(decisions.userId))),
      db
        .select()
        .from(contradictions)
        .where(or(eq(contradictions.userId, uid), isNull(contradictions.userId))),
      db
        .select({ role: messages.role })
        .from(messages)
        .innerJoin(conversations, eq(messages.conversationId, conversations.id))
        .where(and(eq(conversations.userId, uid), eq(messages.role, "user"))),
    ]);

  // Last 14 days window.
  const days: string[] = [];
  for (let i = 13; i >= 0; i--) {
    days.push(dayKey(new Date(Date.now() - i * 24 * 60 * 60 * 1000)));
  }

  const allCreated = [
    ...noteRows.map((n) => n.createdAt),
    ...docRows.map((d) => d.createdAt),
    ...decisionRows.map((d) => d.createdAt),
    ...taskRows.map((t) => t.createdAt),
  ];

  const activityTrend = days.map((date) => ({
    date,
    count: allCreated.filter((c) => dayKey(c) === date).length,
  }));

  const noteByDay = new Map<string, number>();
  for (const n of noteRows) {
    const k = dayKey(n.createdAt);
    noteByDay.set(k, (noteByDay.get(k) ?? 0) + 1);
  }

  const docByDay = new Map<string, number>();
  for (const d of docRows) {
    const k = dayKey(d.createdAt);
    docByDay.set(k, (docByDay.get(k) ?? 0) + 1);
  }

  const dailyRecords = days.map((date) => ({
    date,
    notes: noteByDay.get(date) ?? 0,
    documents: docByDay.get(date) ?? 0,
  }));

  let cumulative = noteRows.filter(
    (n) => new Date(n.createdAt).getTime() < Date.now() - 14 * 24 * 60 * 60 * 1000,
  ).length;

  const knowledgeGrowth = days.map((date) => {
    cumulative += noteByDay.get(date) ?? 0;
    return { date, count: cumulative };
  });

  const tagCounts = new Map<string, number>();

  for (const n of noteRows) {
    for (const tag of n.tags ?? []) {
      const t = tag.trim();
      if (t) tagCounts.set(t, (tagCounts.get(t) ?? 0) + 1);
    }
  }

  // Fall back to keyword extraction from note titles/content when notes are untagged,
  // so the Topic Distribution chart still reflects what the knowledge base is about.
  if (tagCounts.size === 0) {
    for (const n of noteRows) {
      // Titles are concise topic labels, so weight their keywords more heavily.
      for (const w of extractKeywords(n.title)) {
        tagCounts.set(w, (tagCounts.get(w) ?? 0) + 2);
      }

      for (const w of extractKeywords(n.content)) {
        tagCounts.set(w, (tagCounts.get(w) ?? 0) + 1);
      }
    }
  }

  const topicDistribution = [...tagCounts.entries()]
    .map(([topic, count]) => ({ topic, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  res.json(
    GetAnalyticsDashboardResponse.parse({
      totalNotes: noteRows.length,
      totalDocuments: docRows.length,
      totalProjects: projectRows.length,

      // Count only unfinished tasks for the Dashboard "Pending Tasks" card.
      totalTasks: taskRows.filter((t) => t.status !== "done").length,

      decisionsSimulated: decisionRows.length,
      contradictionsFound: contradictionRows.length,
      aiQueriesCount: messageRows.filter((m) => m.role === "user").length,
      activityTrend,
      topicDistribution,
      knowledgeGrowth,
      dailyRecords,
    }),
  );
});

export default router;