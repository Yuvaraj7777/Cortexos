import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const contradictions = pgTable("contradictions", {
  id: serial("id").primaryKey(),
  noteATitle: text("note_a_title").notNull(),
  noteBTitle: text("note_b_title").notNull(),
  explanation: text("explanation").notNull(),
  confidence: integer("confidence").notNull().default(0),
  userId: text("user_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertContradictionSchema = createInsertSchema(contradictions).omit({
  id: true,
  createdAt: true,
});

export type Contradiction = typeof contradictions.$inferSelect;
export type InsertContradiction = z.infer<typeof insertContradictionSchema>;
