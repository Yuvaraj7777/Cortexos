import { useQueryClient } from "@tanstack/react-query";
import {
  useGetKnowledgeGraph,
  useRebuildKnowledgeGraph,
  getGetKnowledgeGraphQueryKey,
} from "@workspace/api-client-react";
import {
  Network,
  RefreshCw,
  Loader2,
  Search,
  X,
  Crosshair,
  Share2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type GraphNode = { id: string; type: string; label: string };
type GraphEdge = { id: string; source: string; target: string; relationship: string };

const TYPE_COLORS: Record<string, string> = {
  note: "#00f0ff",
  concept: "#7000ff",
  topic: "#22d3ee",
  entity: "#a855f7",
};

const FALLBACK_COLOR = "#00f0ff";

function colorFor(type: string): string {
  return TYPE_COLORS[type] ?? FALLBACK_COLOR;
}

const W = 900;
const H = 600;

interface Pt {
  x: number;
  y: number;
  vx: number;
  vy: number;
  fixed: boolean;
}

export default function KnowledgeGraphPage() {
  const queryClient = useQueryClient();
  const { data: graph, isLoading } = useGetKnowledgeGraph();
  const rebuild = useRebuildKnowledgeGraph();

  const handleRebuild = async () => {
    await rebuild.mutateAsync();
    queryClient.invalidateQueries({ queryKey: getGetKnowledgeGraphQueryKey() });
  };

  const allNodes = (graph?.nodes ?? []) as GraphNode[];
  const allEdges = (graph?.edges ?? []) as GraphEdge[];

  const nodeTypes = useMemo(
    () => [...new Set(allNodes.map((n) => n.type))].sort(),
    [allNodes],
  );

  const [activeTypes, setActiveTypes] = useState<Set<string>>(new Set());
  useEffect(() => {
    setActiveTypes(new Set(nodeTypes));
  }, [nodeTypes]);

  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoverId, setHoverId] = useState<string | null>(null);

  const nodes = useMemo(
    () => allNodes.filter((n) => activeTypes.has(n.type)),
    [allNodes, activeTypes],
  );
  const nodeIdSet = useMemo(() => new Set(nodes.map((n) => n.id)), [nodes]);
  const edges = useMemo(
    () => allEdges.filter((e) => nodeIdSet.has(e.source) && nodeIdSet.has(e.target)),
    [allEdges, nodeIdSet],
  );

  // Degree (connection count) per node.
  const degree = useMemo(() => {
    const d = new Map<string, number>();
    for (const e of edges) {
      d.set(e.source, (d.get(e.source) ?? 0) + 1);
      d.set(e.target, (d.get(e.target) ?? 0) + 1);
    }
    return d;
  }, [edges]);

  // Adjacency for neighbor highlighting + the detail panel.
  const neighbors = useMemo(() => {
    const m = new Map<string, { id: string; relationship: string }[]>();
    for (const e of edges) {
      if (!m.has(e.source)) m.set(e.source, []);
      if (!m.has(e.target)) m.set(e.target, []);
      m.get(e.source)!.push({ id: e.target, relationship: e.relationship });
      m.get(e.target)!.push({ id: e.source, relationship: e.relationship });
    }
    return m;
  }, [edges]);

  const labelById = useMemo(() => {
    const m = new Map<string, GraphNode>();
    for (const n of allNodes) m.set(n.id, n);
    return m;
  }, [allNodes]);

  // ---- Force simulation -------------------------------------------------
  const posRef = useRef<Map<string, Pt>>(new Map());
  const alphaRef = useRef(1);
  const rafRef = useRef<number | null>(null);
  const stepRef = useRef<(() => void) | null>(null);
  const [, setTick] = useState(0);

  const sigNodes = nodes.map((n) => n.id).join(",");
  const sigEdges = edges.map((e) => `${e.source}>${e.target}`).join(",");

  useEffect(() => {
    const pos = posRef.current;
    // Seed positions for new nodes on a circle; keep existing ones.
    nodes.forEach((n, i) => {
      if (!pos.has(n.id)) {
        const a = (i / Math.max(nodes.length, 1)) * Math.PI * 2;
        pos.set(n.id, {
          x: W / 2 + Math.cos(a) * 180 + (Math.random() - 0.5) * 40,
          y: H / 2 + Math.sin(a) * 180 + (Math.random() - 0.5) * 40,
          vx: 0,
          vy: 0,
          fixed: false,
        });
      }
    });
    // Drop positions for removed nodes.
    for (const id of [...pos.keys()]) {
      if (!nodeIdSet.has(id)) pos.delete(id);
    }
    alphaRef.current = 1;

    const step = () => {
      const p = posRef.current;
      const list = nodes.map((n) => p.get(n.id)!).filter(Boolean);
      const alpha = alphaRef.current;

      // Repulsion between all pairs.
      for (let i = 0; i < list.length; i++) {
        for (let j = i + 1; j < list.length; j++) {
          const a = list[i];
          const b = list[j];
          let dx = a.x - b.x;
          let dy = a.y - b.y;
          let dist2 = dx * dx + dy * dy;
          if (dist2 < 0.01) {
            dx = Math.random() - 0.5;
            dy = Math.random() - 0.5;
            dist2 = 1;
          }
          const dist = Math.sqrt(dist2);
          const force = (5200 / dist2) * alpha;
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;
          a.vx += fx;
          a.vy += fy;
          b.vx -= fx;
          b.vy -= fy;
        }
      }

      // Spring attraction along edges.
      for (const e of edges) {
        const a = p.get(e.source);
        const b = p.get(e.target);
        if (!a || !b) continue;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const force = (dist - 110) * 0.025 * alpha;
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        a.vx += fx;
        a.vy += fy;
        b.vx -= fx;
        b.vy -= fy;
      }

      // Gravity toward center + integrate.
      for (const n of list) {
        if (n.fixed) {
          n.vx = 0;
          n.vy = 0;
          continue;
        }
        n.vx += (W / 2 - n.x) * 0.008 * alpha;
        n.vy += (H / 2 - n.y) * 0.008 * alpha;
        n.vx *= 0.82;
        n.vy *= 0.82;
        n.x += n.vx;
        n.y += n.vy;
      }

      alphaRef.current = Math.max(alpha * 0.985, 0);
      setTick((t) => (t + 1) % 1_000_000);
      if (alphaRef.current > 0.02) {
        rafRef.current = requestAnimationFrame(step);
      } else {
        rafRef.current = null;
      }
    };

    stepRef.current = step;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (nodes.length > 0) rafRef.current = requestAnimationFrame(step);

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sigNodes, sigEdges]);

  const reheat = useCallback(() => {
    alphaRef.current = Math.max(alphaRef.current, 0.6);
    if (!rafRef.current && stepRef.current) {
      rafRef.current = requestAnimationFrame(stepRef.current);
    }
  }, []);

  // ---- Pan / zoom -------------------------------------------------------
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [view, setView] = useState({ x: 0, y: 0, k: 1 });
  const interaction = useRef<{
    mode: "none" | "pan" | "drag";
    nodeId: string | null;
    lastX: number;
    lastY: number;
    downX: number;
    downY: number;
  }>({ mode: "none", nodeId: null, lastX: 0, lastY: 0, downX: 0, downY: 0 });
  const clickSuppress = useRef(false);

  const toSvg = useCallback((clientX: number, clientY: number) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: ((clientX - rect.left) / rect.width) * W,
      y: ((clientY - rect.top) / rect.height) * H,
    };
  }, []);

  const onWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const { x: sx, y: sy } = toSvg(e.clientX, e.clientY);
      setView((v) => {
        const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
        const k = Math.min(4, Math.max(0.3, v.k * factor));
        const ratio = k / v.k;
        return {
          k,
          x: sx - (sx - v.x) * ratio,
          y: sy - (sy - v.y) * ratio,
        };
      });
    },
    [toSvg],
  );

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const it = interaction.current;
      if (it.mode === "none") return;
      const cur = toSvg(e.clientX, e.clientY);
      const last = toSvg(it.lastX, it.lastY);
      if (it.mode === "pan") {
        setView((v) => ({ ...v, x: v.x + (cur.x - last.x), y: v.y + (cur.y - last.y) }));
      } else if (it.mode === "drag" && it.nodeId) {
        setView((v) => {
          const gx = (cur.x - v.x) / v.k;
          const gy = (cur.y - v.y) / v.k;
          const pt = posRef.current.get(it.nodeId!);
          if (pt) {
            pt.x = gx;
            pt.y = gy;
            pt.vx = 0;
            pt.vy = 0;
          }
          return v;
        });
        reheat();
      }
      it.lastX = e.clientX;
      it.lastY = e.clientY;
    };
    const onUp = (e: MouseEvent) => {
      const it = interaction.current;
      const dist = Math.hypot(e.clientX - it.downX, e.clientY - it.downY);
      if (it.mode === "drag") {
        if (it.nodeId) {
          const pt = posRef.current.get(it.nodeId);
          if (pt) pt.fixed = false;
        }
        // Suppress the click that follows a real drag so it doesn't toggle selection.
        if (dist > 4) clickSuppress.current = true;
      }
      it.mode = "none";
      it.nodeId = null;
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [toSvg, reheat]);

  const startPan = (e: React.MouseEvent) => {
    interaction.current = {
      mode: "pan",
      nodeId: null,
      lastX: e.clientX,
      lastY: e.clientY,
      downX: e.clientX,
      downY: e.clientY,
    };
  };
  const startDrag = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const pt = posRef.current.get(id);
    if (pt) pt.fixed = true;
    interaction.current = {
      mode: "drag",
      nodeId: id,
      lastX: e.clientX,
      lastY: e.clientY,
      downX: e.clientX,
      downY: e.clientY,
    };
  };

  const resetView = () => setView({ x: 0, y: 0, k: 1 });

  const toggleType = (t: string) => {
    setActiveTypes((prev) => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t);
      else next.add(t);
      return next;
    });
  };

  const q = query.trim().toLowerCase();
  const matches = useCallback(
    (n: GraphNode) => q.length > 0 && n.label.toLowerCase().includes(q),
    [q],
  );

  const focusNode = selectedId ?? hoverId;
  const neighborSet = useMemo(() => {
    if (!focusNode) return null;
    const s = new Set<string>([focusNode]);
    for (const nb of neighbors.get(focusNode) ?? []) s.add(nb.id);
    return s;
  }, [focusNode, neighbors]);

  const selectedNode = selectedId ? labelById.get(selectedId) : undefined;
  const selectedNeighbors = selectedId ? neighbors.get(selectedId) ?? [] : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight neon-text flex items-center gap-3">
            <Network className="text-secondary" />
            Knowledge Graph
          </h1>
          <p className="text-muted-foreground mt-1">
            {nodes.length} nodes · {edges.length} connections
            {nodes.length !== allNodes.length && (
              <span className="text-secondary"> · {allNodes.length - nodes.length} hidden</span>
            )}
          </p>
        </div>
        <Button onClick={handleRebuild} disabled={rebuild.isPending}>
          {rebuild.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Rebuilding...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" /> Rebuild Graph
            </>
          )}
        </Button>
      </div>

      {/* Controls */}
      {allNodes.length > 0 && (
        <div className="flex flex-col lg:flex-row gap-3 lg:items-center">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search nodes..."
              className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-8 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/60"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {nodeTypes.map((t) => {
              const on = activeTypes.has(t);
              return (
                <button
                  key={t}
                  onClick={() => toggleType(t)}
                  className={`flex items-center gap-2 rounded-full border px-3 py-1 text-xs capitalize transition ${
                    on
                      ? "border-white/20 bg-white/10 text-white"
                      : "border-white/5 bg-transparent text-muted-foreground opacity-50"
                  }`}
                >
                  <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: colorFor(t) }} />
                  {t}
                </button>
              );
            })}
          </div>
          <Button variant="outline" size="sm" onClick={resetView} className="gap-2">
            <Crosshair className="h-4 w-4" /> Reset view
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 glass-card rounded-xl p-2 overflow-hidden">
          {isLoading ? (
            <div className="h-[600px] flex items-center justify-center text-muted-foreground">Loading...</div>
          ) : allNodes.length === 0 ? (
            <div className="h-[600px] flex items-center justify-center text-center text-muted-foreground px-6">
              No graph yet. Rebuild to extract concepts and relationships from your notes.
            </div>
          ) : (
            <svg
              ref={svgRef}
              viewBox={`0 0 ${W} ${H}`}
              className="w-full h-auto cursor-grab active:cursor-grabbing select-none"
              onWheel={onWheel}
              onMouseDown={startPan}
              onClick={() => {
                if (clickSuppress.current) {
                  clickSuppress.current = false;
                  return;
                }
                setSelectedId(null);
              }}
            >
              <rect x={0} y={0} width={W} height={H} fill="transparent" />
              <g transform={`translate(${view.x},${view.y}) scale(${view.k})`}>
                {edges.map((e) => {
                  const s = posRef.current.get(e.source);
                  const t = posRef.current.get(e.target);
                  if (!s || !t) return null;
                  const active =
                    !neighborSet ||
                    (neighborSet.has(e.source) && neighborSet.has(e.target));
                  const mx = (s.x + t.x) / 2;
                  const my = (s.y + t.y) / 2;
                  const showLabel = selectedId
                    ? e.source === selectedId || e.target === selectedId
                    : false;
                  return (
                    <g key={e.id} opacity={active ? 1 : 0.08}>
                      <line
                        x1={s.x}
                        y1={s.y}
                        x2={t.x}
                        y2={t.y}
                        stroke={active && neighborSet ? "rgba(0,240,255,0.5)" : "rgba(112,0,255,0.3)"}
                        strokeWidth={active && neighborSet ? 1.6 : 1}
                      />
                      {showLabel && (
                        <text
                          x={mx}
                          y={my}
                          textAnchor="middle"
                          fill="rgba(255,255,255,0.65)"
                          fontSize={8}
                          fontFamily="monospace"
                        >
                          {e.relationship}
                        </text>
                      )}
                    </g>
                  );
                })}
                {nodes.map((n) => {
                  const p = posRef.current.get(n.id);
                  if (!p) return null;
                  const color = colorFor(n.type);
                  const deg = degree.get(n.id) ?? 0;
                  const r = (n.type === "note" ? 7 : 5) + Math.min(deg, 8);
                  const dimmed = neighborSet ? !neighborSet.has(n.id) : false;
                  const isMatch = matches(n);
                  const isSelected = selectedId === n.id;
                  return (
                    <g
                      key={n.id}
                      transform={`translate(${p.x},${p.y})`}
                      opacity={dimmed && !isMatch ? 0.18 : 1}
                      className="cursor-pointer"
                      onMouseDown={(e) => startDrag(e, n.id)}
                      onMouseEnter={() => setHoverId(n.id)}
                      onMouseLeave={() => setHoverId(null)}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (clickSuppress.current) {
                          clickSuppress.current = false;
                          return;
                        }
                        setSelectedId((cur) => (cur === n.id ? null : n.id));
                      }}
                    >
                      {(isSelected || isMatch) && (
                        <circle r={r + 8} fill="none" stroke={color} strokeWidth={1.5} opacity={0.8} />
                      )}
                      <circle r={r + 6} fill={color} opacity={0.12} />
                      <circle r={r} fill={color} opacity={0.95} />
                      <text
                        y={-r - 6}
                        textAnchor="middle"
                        fill="rgba(255,255,255,0.85)"
                        fontSize={9}
                        fontFamily="monospace"
                      >
                        {n.label.length > 20 ? `${n.label.slice(0, 20)}…` : n.label}
                      </text>
                    </g>
                  );
                })}
              </g>
            </svg>
          )}
        </div>

        {/* Inspector panel */}
        <div className="glass-card rounded-xl p-5 flex flex-col">
          {selectedNode ? (
            <>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-block h-3 w-3 rounded-full"
                      style={{ background: colorFor(selectedNode.type) }}
                    />
                    <span className="text-xs uppercase tracking-wider text-muted-foreground">
                      {selectedNode.type}
                    </span>
                  </div>
                  <h2 className="text-lg font-bold mt-1 break-words">{selectedNode.label}</h2>
                </div>
                <button
                  onClick={() => setSelectedId(null)}
                  className="text-muted-foreground hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                <Share2 className="h-4 w-4" />
                {selectedNeighbors.length} connection{selectedNeighbors.length === 1 ? "" : "s"}
              </div>
              <div className="mt-3 space-y-2 overflow-auto max-h-[420px] pr-1">
                {selectedNeighbors.map((nb, i) => {
                  const node = labelById.get(nb.id);
                  if (!node) return null;
                  return (
                    <button
                      key={`${nb.id}-${i}`}
                      onClick={() => setSelectedId(nb.id)}
                      className="w-full text-left rounded-lg border border-white/5 bg-white/5 hover:bg-white/10 transition p-3"
                    >
                      <div className="text-[10px] uppercase tracking-wider text-secondary">
                        {nb.relationship}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span
                          className="inline-block h-2.5 w-2.5 rounded-full shrink-0"
                          style={{ background: colorFor(node.type) }}
                        />
                        <span className="text-sm break-words">{node.label}</span>
                      </div>
                    </button>
                  );
                })}
                {selectedNeighbors.length === 0 && (
                  <p className="text-sm text-muted-foreground italic">No connections.</p>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center text-muted-foreground gap-3 py-12">
              <Network className="h-8 w-8 opacity-40" />
              <p className="text-sm">
                Select a node to inspect its connections.
                <br />
                Scroll to zoom, drag to pan, drag a node to reposition it.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
