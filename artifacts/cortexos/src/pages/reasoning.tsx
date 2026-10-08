import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useMultiAgentReason,
  useListReasoningRuns,
  useDeleteReasoningRun,
  getListReasoningRunsQueryKey,
  type ReasoningRun,
} from "@workspace/api-client-react";
import {
  Users,
  Sparkles,
  Loader2,
  TrendingUp,
  ShieldAlert,
  Compass,
  FlaskConical,
  Swords,
  GitMerge,
  History,
  Trash2,
  AlertTriangle,
  ListChecks,
  Gauge,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

const AGENTS = [
  { key: "optimist", label: "The Optimist", icon: TrendingUp, color: "text-emerald-400", border: "border-emerald-400/20" },
  { key: "critic", label: "The Critic", icon: ShieldAlert, color: "text-rose-400", border: "border-rose-400/20" },
  { key: "strategist", label: "The Strategist", icon: Compass, color: "text-sky-400", border: "border-sky-400/20" },
  { key: "scientist", label: "The Scientist", icon: FlaskConical, color: "text-violet-400", border: "border-violet-400/20" },
  { key: "devilsAdvocate", label: "Devil's Advocate", icon: Swords, color: "text-amber-400", border: "border-amber-400/20" },
] as const;

function formatDate(value: string | Date) {
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function ConfidenceBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="mt-3">
      <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
        <span>Confidence</span>
        <span className={`font-mono font-semibold ${color}`}>{value}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
        <div
          className="h-full rounded-full bg-current transition-all"
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

function Panel({ run }: { run: ReasoningRun }) {
  const confidences = (run.confidences ?? {}) as unknown as Record<string, number>;
  const keyRisks = run.keyRisks ?? [];
  const nextSteps = run.nextSteps ?? [];
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {AGENTS.map((agent) => {
          const text = (run as unknown as Record<string, string>)[agent.key];
          const conf = confidences[agent.key];
          return (
            <div key={agent.key} className={`glass-card p-5 rounded-xl border ${agent.border} flex flex-col`}>
              <div className={`flex items-center gap-2 mb-3 font-semibold ${agent.color}`}>
                <agent.icon className="h-4 w-4" />
                {agent.label}
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap flex-1">{text}</p>
              {typeof conf === "number" && <ConfidenceBar value={conf} color={agent.color} />}
            </div>
          );
        })}
      </div>

      <div className="glass-card p-6 rounded-xl border border-primary/30 shadow-[0_0_20px_rgba(0,240,255,0.08)] space-y-5">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2 font-bold text-primary">
            <GitMerge className="h-5 w-5" />
            Synthesis
          </div>
          {typeof run.confidence === "number" && (
            <div className="flex items-center gap-2 text-sm">
              <Gauge className="h-4 w-4 text-primary" />
              <span className="text-muted-foreground">Overall confidence</span>
              <span className="font-mono font-bold text-primary">{run.confidence}%</span>
            </div>
          )}
        </div>

        {run.recommendation && (
          <div className="rounded-lg border border-primary/20 bg-primary/[0.06] p-4">
            <div className="text-xs uppercase tracking-wide text-primary/80 font-semibold mb-1">
              Recommendation
            </div>
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{run.recommendation}</p>
          </div>
        )}

        <p className="text-sm leading-relaxed whitespace-pre-wrap text-muted-foreground">{run.synthesis}</p>

        {(keyRisks.length > 0 || nextSteps.length > 0) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {keyRisks.length > 0 && (
              <div className="rounded-lg border border-amber-400/20 bg-amber-400/[0.04] p-4">
                <div className="flex items-center gap-2 text-amber-400 font-semibold text-sm mb-2">
                  <AlertTriangle className="h-4 w-4" /> Key Risks
                </div>
                <ul className="space-y-1.5">
                  {keyRisks.map((r, i) => (
                    <li key={i} className="text-sm text-muted-foreground flex gap-2">
                      <span className="text-amber-400/70 mt-0.5">·</span>
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {nextSteps.length > 0 && (
              <div className="rounded-lg border border-emerald-400/20 bg-emerald-400/[0.04] p-4">
                <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm mb-2">
                  <ListChecks className="h-4 w-4" /> Next Steps
                </div>
                <ol className="space-y-1.5">
                  {nextSteps.map((s, i) => (
                    <li key={i} className="text-sm text-muted-foreground flex gap-2">
                      <span className="text-emerald-400/70 font-mono mt-0.5">{i + 1}.</span>
                      <span>{s}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ReasoningPage() {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<ReasoningRun | null>(null);
  const reason = useMultiAgentReason();
  const result = reason.data;
  const queryClient = useQueryClient();

  const { data: runs } = useListReasoningRuns();
  const deleteRun = useDeleteReasoningRun();

  const refreshRuns = () =>
    queryClient.invalidateQueries({ queryKey: getListReasoningRunsQueryKey() });

  const handleRun = async () => {
    if (!query.trim()) return;
    await reason.mutateAsync({ data: { query: query.trim() } });
    refreshRuns();
  };

  const handleDelete = async (id: number) => {
    await deleteRun.mutateAsync({ id });
    refreshRuns();
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight neon-text flex items-center gap-3">
        <Users className="text-secondary" />
        Multi-Agent Reasoning
      </h1>
      <p className="text-muted-foreground -mt-2">
        A panel of six specialized agents debates your question from every angle, grounded in your knowledge base, then synthesizes a recommendation.
      </p>

      <div className="glass-card p-6 rounded-xl space-y-4">
        <Textarea
          placeholder="Pose a question or decision for the panel to reason through..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="min-h-[90px]"
        />
        <Button onClick={handleRun} disabled={!query.trim() || reason.isPending}>
          {reason.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Convening panel...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" /> Run Reasoning
            </>
          )}
        </Button>
      </div>

      {reason.isError && (
        <div className="glass-card p-4 rounded-xl border border-destructive/30 text-destructive">
          Reasoning failed. Please try again.
        </div>
      )}

      {result && <Panel run={result as unknown as ReasoningRun} />}

      {runs && runs.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-bold flex items-center gap-2 text-secondary">
            <History className="h-5 w-5" /> History
          </h2>
          <div className="space-y-3">
            {runs.map((run) => (
              <div
                key={run.id}
                role="button"
                tabIndex={0}
                onClick={() => setSelected(run)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setSelected(run);
                  }
                }}
                className="glass-card p-5 rounded-xl flex items-start justify-between gap-4 cursor-pointer transition-colors hover:border-primary/40 hover:bg-white/[0.04] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
              >
                <div className="min-w-0">
                  <h3 className="font-semibold truncate">{run.query}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                    {run.synthesis}
                  </p>
                  <span className="text-xs font-mono text-muted-foreground mt-2 inline-block">
                    {formatDate(run.createdAt)}
                  </span>
                </div>
                <Button
                  variant="destructive"
                  size="icon"
                  className="shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(run.id);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-4xl">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle>{selected.query}</DialogTitle>
                <DialogDescription className="font-mono text-xs">
                  {formatDate(selected.createdAt)}
                </DialogDescription>
              </DialogHeader>
              <div className="max-h-[65vh] overflow-y-auto">
                <Panel run={selected} />
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
