import { pgTable, serial, text, timestamp, integer, jsonb } from "drizzle-orm/pg-core";

export const reasoningRuns = pgTable("reasoning_runs", {
  id: serial("id").primaryKey(),
  query: text("query").notNull(),
  optimist: text("optimist").notNull().default(""),
  critic: text("critic").notNull().default(""),
  strategist: text("strategist").notNull().default(""),
  scientist: text("scientist").notNull().default(""),
  devilsAdvocate: text("devils_advocate").notNull().default(""),
  synthesis: text("synthesis").notNull().default(""),
  confidences: jsonb("confidences")
    .$type<Record<string, number>>()
    .notNull()
    .default({
      optimist: 0,
      critic: 0,
      strategist: 0,
      scientist: 0,
      devilsAdvocate: 0,
    }),
  recommendation: text("recommendation").notNull().default(""),
  confidence: integer("confidence").notNull().default(0),
  keyRisks: jsonb("key_risks").$type<string[]>().notNull().default([]),
  nextSteps: jsonb("next_steps").$type<string[]>().notNull().default([]),
  userId: text("user_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export type ReasoningRun = typeof reasoningRuns.$inferSelect;
