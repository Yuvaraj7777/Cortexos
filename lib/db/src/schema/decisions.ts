import { pgTable, serial, text, integer, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const decisions = pgTable("decisions", {
  id: serial("id").primaryKey(),
  question: text("question").notNull(),
  pros: jsonb("pros").$type<string[]>().notNull().default([]),
  cons: jsonb("cons").$type<string[]>().notNull().default([]),
  risks: jsonb("risks").$type<string[]>().notNull().default([]),
  opportunities: jsonb("opportunities").$type<string[]>().notNull().default([]),
  confidence: integer("confidence").notNull().default(0),
  successProbability: integer("success_probability").notNull().default(0),
  prediction: text("prediction").notNull().default(""),
  recommendedAction: text("recommended_action").notNull().default(""),
  userId: text("user_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertDecisionSchema = createInsertSchema(decisions).omit({
  id: true,
  createdAt: true,
});

export type Decision = typeof decisions.$inferSelect;
export type InsertDecision = z.infer<typeof insertDecisionSchema>;
