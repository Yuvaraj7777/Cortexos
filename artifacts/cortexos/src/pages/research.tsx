import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useResearchQuery,
  useListResearchRuns,
  useDeleteResearchRun,
  getListResearchRunsQueryKey,
  type ResearchRun,
} from "@workspace/api-client-react";
import {
  Search,
  Sparkles,
  Loader2,
  Lightbulb,
  FileText,
  History,
  Trash2,
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

function formatDate(value: string | Date) {
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ResearchPage() {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<ResearchRun | null>(null);
  const research = useResearchQuery();
  const result = research.data;
  const queryClient = useQueryClient();

  const { data: runs } = useListResearchRuns();
  const deleteRun = useDeleteResearchRun();

  const refreshRuns = () =>
    queryClient.invalidateQueries({ queryKey: getListResearchRunsQueryKey() });

  const handleQuery = async () => {
    if (!query.trim()) return;
    await research.mutateAsync({
      data: { query: query.trim(), includeNotes: true },
    });
    refreshRuns();
  };

  const handleDelete = async (id: number) => {
    await deleteRun.mutateAsync({ id });
    refreshRuns();
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight neon-text flex items-center gap-3">
        <Search className="text-secondary" />
        Research Copilot
      </h1>
      <p className="text-muted-foreground -mt-2">
        Retrieval-augmented analysis grounded in your own knowledge base.
      </p>

      <div className="glass-card p-6 rounded-xl space-y-4">
        <Textarea
          placeholder="What do you want to research? (e.g. Synthesize my thinking on productivity)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="min-h-[80px]"
        />
        <Button onClick={handleQuery} disabled={!query.trim() || research.isPending}>
          {research.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Researching...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" /> Run Research
            </>
          )}
        </Button>
      </div>

      {research.isError && (
        <div className="glass-card p-4 rounded-xl border border-destructive/30 text-destructive">
          Research failed. Please try again.
        </div>
      )}

      {result && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 glass-card p-6 rounded-xl">
            <h2 className="text-lg font-bold mb-3 text-primary">Answer</h2>
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{result.answer}</p>
          </div>

          <div className="space-y-4">
            {result.insights?.length > 0 && (
              <div className="glass-card p-5 rounded-xl">
                <div className="flex items-center gap-2 font-semibold mb-3 text-secondary">
                  <Lightbulb className="h-4 w-4" /> Key Insights
                </div>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  {result.insights.map((insight, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="text-primary/50">—</span>
                      {insight}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {result.sources?.length > 0 && (
              <div className="glass-card p-5 rounded-xl">
                <div className="flex items-center gap-2 font-semibold mb-3 text-secondary">
                  <FileText className="h-4 w-4" /> Sources
                </div>
                <div className="space-y-3">
                  {result.sources.map((s, i) => (
                    <div key={i} className="bg-white/5 border border-white/10 rounded-lg p-3">
                      <div className="text-sm font-medium mb-1">{s.title}</div>
                      <p className="text-xs text-muted-foreground line-clamp-2">{s.excerpt}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

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
                    {run.answer}
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
        <DialogContent className="max-w-2xl">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle>{selected.query}</DialogTitle>
                <DialogDescription className="font-mono text-xs">
                  {formatDate(selected.createdAt)}
                </DialogDescription>
              </DialogHeader>
              <div className="max-h-[60vh] overflow-y-auto space-y-4">
                <div>
                  <div className="text-sm font-semibold text-primary mb-2">Answer</div>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground/90">
                    {selected.answer}
                  </p>
                </div>
                {selected.insights.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 text-sm font-semibold text-secondary mb-2">
                      <Lightbulb className="h-4 w-4" /> Key Insights
                    </div>
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      {selected.insights.map((insight, i) => (
                        <li key={i} className="flex gap-2">
                          <span className="text-primary/50">—</span>
                          {insight}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {selected.sources.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 text-sm font-semibold text-secondary mb-2">
                      <FileText className="h-4 w-4" /> Sources
                    </div>
                    <div className="space-y-2">
                      {selected.sources.map((s, i) => (
                        <div key={i} className="bg-white/5 border border-white/10 rounded-lg p-3">
                          <div className="text-sm font-medium mb-1">{s.title}</div>
                          <p className="text-xs text-muted-foreground">{s.excerpt}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
