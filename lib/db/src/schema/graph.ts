import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const graphNodes = pgTable("graph_nodes", {
  id: serial("id").primaryKey(),
  nodeKey: text("node_key").notNull(),
  nodeType: text("node_type").notNull(),
  label: text("label").notNull(),
  userId: text("user_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const graphEdges = pgTable("graph_edges", {
  id: serial("id").primaryKey(),
  sourceKey: text("source_key").notNull(),
  targetKey: text("target_key").notNull(),
  relationship: text("relationship").notNull(),
  userId: text("user_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertGraphNodeSchema = createInsertSchema(graphNodes).omit({
  id: true,
  createdAt: true,
});

export const insertGraphEdgeSchema = createInsertSchema(graphEdges).omit({
  id: true,
  createdAt: true,
});

export type GraphNodeRow = typeof graphNodes.$inferSelect;
export type GraphEdgeRow = typeof graphEdges.$inferSelect;
export type InsertGraphNode = z.infer<typeof insertGraphNodeSchema>;
export type InsertGraphEdge = z.infer<typeof insertGraphEdgeSchema>;
