import { eq, isNull, or } from "drizzle-orm";
import { db, notes, documents, projects } from "@workspace/db";

const MAX_CORPUS_CHARS = 40_000;
const MAX_DOC_CHARS = 4_000;

/**
 * Build a text corpus of all notes visible to the user (their own notes plus
 * shared/seed notes) for use as grounding context in AI prompts. Returns an
 * empty string when the user has no notes.
 */
export async function getNotesCorpus(uid: string): Promise<string> {
  const rows = await db
    .select()
    .from(notes)
    .where(or(eq(notes.userId, uid), isNull(notes.userId)));

  let corpus = "";
  for (const n of rows) {
    const entry = `[id:${n.id}] "${n.title}": ${n.content}\n`;
    if (corpus.length + entry.length > MAX_CORPUS_CHARS) break;
    corpus += entry;
  }
  return corpus.trim();
}

/**
 * Build a broader knowledge corpus spanning the user's notes, documents, and
 * projects (their own plus shared/seed rows) for grounding AI chat answers.
 * Each section is budgeted against an overall character cap; document bodies
 * are truncated per-item so a single large file cannot crowd out everything
 * else. Returns an empty string when nothing is available.
 */
export async function getKnowledgeCorpus(uid: string): Promise<string> {
  const [noteRows, docRows, projectRows] = await Promise.all([
    db
      .select()
      .from(notes)
      .where(or(eq(notes.userId, uid), isNull(notes.userId))),
    db
      .select()
      .from(documents)
      .where(or(eq(documents.userId, uid), isNull(documents.userId))),
    db
      .select()
      .from(projects)
      .where(or(eq(projects.userId, uid), isNull(projects.userId))),
  ]);

  const sections: string[] = [];
  let used = 0;

  const appendSection = (header: string, entries: string[]): void => {
    if (entries.length === 0) return;
    let block = `## ${header}\n`;
    for (const entry of entries) {
      // Skip (don't break on) an entry that would exceed the budget, so later
      // smaller entries can still be packed in.
      if (used + block.length + entry.length > MAX_CORPUS_CHARS) continue;
      block += entry;
    }
    if (block.length > header.length + 4) {
      sections.push(block);
      used += block.length;
    }
  };

  appendSection(
    "NOTES",
    noteRows.map((n) => `[note:${n.id}] "${n.title}": ${n.content}\n`),
  );
  appendSection(
    "DOCUMENTS",
    docRows.map(
      (d) =>
        `[document:${d.id}] "${d.fileName}" (${d.fileType}): ${d.content.slice(
          0,
          MAX_DOC_CHARS,
        )}\n`,
    ),
  );
  appendSection(
    "PROJECTS",
    projectRows.map(
      (p) => `[project:${p.id}] "${p.name}": ${p.description ?? ""}\n`,
    ),
  );

  return sections.join("\n").trim();
}
