import { Router, type IRouter } from "express";
import { eq, isNull, or } from "drizzle-orm";
import { db, graphNodes, graphEdges, notes } from "@workspace/db";
import {
  GetKnowledgeGraphResponse,
  RebuildKnowledgeGraphResponse,
} from "@workspace/api-zod";
import { requireAuth } from "../lib/auth";
import { aiJSON } from "../lib/ai";
import { recordMemory } from "../lib/memory";

const router: IRouter = Router();

router.use(requireAuth);

interface GraphPlan {
  nodes: { key: string; type: string; label: string }[];
  edges: { source: string; target: string; relationship: string }[];
}

router.get("/graph", async (req, res): Promise<void> => {
  const uid = req.userId!;
  // The graph is per-user derived data fully owned by /graph/rebuild (which deletes
  // and re-inserts only this user's rows). Scope strictly to the user so stale shared
  // (NULL-owned) nodes from seed data never linger after a rebuild.
  const nodeRows = await db
    .select()
    .from(graphNodes)
    .where(eq(graphNodes.userId, uid));
  const edgeRows = await db
    .select()
    .from(graphEdges)
    .where(eq(graphEdges.userId, uid));

  res.json(
    GetKnowledgeGraphResponse.parse({
      nodes: nodeRows.map((n) => ({
        id: n.nodeKey,
        type: n.nodeType,
        label: n.label,
      })),
      edges: edgeRows.map((e) => ({
        id: String(e.id),
        source: e.sourceKey,
        target: e.targetKey,
        relationship: e.relationship,
      })),
    }),
  );
});

router.post("/graph/rebuild", async (req, res): Promise<void> => {
  const uid = req.userId!;
  const noteRows = await db
    .select()
    .from(notes)
    .where(or(eq(notes.userId, uid), isNull(notes.userId)));

  await db.delete(graphEdges).where(eq(graphEdges.userId, uid));
  await db.delete(graphNodes).where(eq(graphNodes.userId, uid));

  if (noteRows.length === 0) {
    res.json(
      RebuildKnowledgeGraphResponse.parse({ nodesCreated: 0, edgesCreated: 0 }),
    );
    return;
  }

  const corpus = noteRows
    .map((n) => `id:note-${n.id} | title:"${n.title}" | tags:${(n.tags ?? []).join(", ")} | ${n.content}`)
    .join("\n");

  const plan = await aiJSON<GraphPlan>(
    `You build a knowledge graph from a set of notes. Identify the key concepts/entities and the relationships between them.
Return JSON with:
"nodes": array of { "key": string (unique slug), "type": one of "note"|"concept"|"topic"|"entity", "label": string (human readable) },
"edges": array of { "source": string (a node key), "target": string (a node key), "relationship": string (e.g. "relates to", "supports", "contradicts", "part of") }.
Always include one node per note using key "note-<id>" and type "note". Then add concept/topic nodes and connect them. Keep it under 40 nodes.`,
    `Notes:\n${corpus}`,
  );

  const planNodes = plan.nodes ?? [];
  const planEdges = plan.edges ?? [];

  if (planNodes.length > 0) {
    await db.insert(graphNodes).values(
      planNodes.map((n) => ({
        nodeKey: n.key,
        nodeType: n.type,
        label: n.label,
        userId: uid,
      })),
    );
  }

  const validKeys = new Set(planNodes.map((n) => n.key));
  const validEdges = planEdges.filter(
    (e) => validKeys.has(e.source) && validKeys.has(e.target),
  );
  if (validEdges.length > 0) {
    await db.insert(graphEdges).values(
      validEdges.map((e) => ({
        sourceKey: e.source,
        targetKey: e.target,
        relationship: e.relationship,
        userId: uid,
      })),
    );
  }

  await recordMemory(
    "graph_rebuilt",
    `Rebuilt knowledge graph (${planNodes.length} nodes)`,
    uid,
  );

  res.json(
    RebuildKnowledgeGraphResponse.parse({
      nodesCreated: planNodes.length,
      edgesCreated: validEdges.length,
    }),
  );
});

export default router;
