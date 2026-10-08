import { db, memoryEntries } from "@workspace/db";

export async function recordMemory(
  memoryType: string,
  content: string,
  userId?: string | null,
): Promise<void> {
  try {
    await db.insert(memoryEntries).values({
      memoryType,
      content,
      userId: userId ?? null,
    });
  } catch {
    // Memory logging is best-effort; never block the primary action.
  }
}
