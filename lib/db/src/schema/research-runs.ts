import { pgTable, serial, text, jsonb, timestamp } from "drizzle-orm/pg-core";

export interface ResearchSourceData {
  title: string;
  excerpt: string;
  relevance: number;
}

export const researchRuns = pgTable("research_runs", {
  id: serial("id").primaryKey(),
  query: text("query").notNull(),
  answer: text("answer").notNull().default(""),
  insights: jsonb("insights").$type<string[]>().notNull().default([]),
  sources: jsonb("sources")
    .$type<ResearchSourceData[]>()
    .notNull()
    .default([]),
  userId: text("user_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export type ResearchRun = typeof researchRuns.$inferSelect;
