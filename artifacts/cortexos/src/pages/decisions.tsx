import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListDecisions,
  useSimulateDecision,
  useDeleteDecision,
  getListDecisionsQueryKey,
} from "@workspace/api-client-react";
import {
  SplitSquareHorizontal,
  Sparkles,
  Loader2,
  ThumbsUp,
  ThumbsDown,
  AlertTriangle,
  Lightbulb,
  Trash2,
  Target,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

function Meter({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex-1">
      <div className="flex justify-between text-xs text-muted-foreground mb-1">
        <span>{label}</span>
        <span className="font-mono text-primary">{value}%</span>
      </div>
      <div className="h-2 rounded-full bg-white/5 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-primary to-secondary"
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

function List({ title, items, icon: Icon, color }: { title: string; items: string[]; icon: typeof ThumbsUp; color: string }) {
  if (!items?.length) return null;
  return (
    <div>
      <div className={`flex items-center gap-2 text-sm font-semibold mb-2 ${color}`}>
        <Icon className="h-4 w-4" />
        {title}
      </div>
      <ul className="space-y-1 text-sm text-muted-foreground">
        {items.map((item, i) => (
          <li key={i} className="flex gap-2">
            <span className="text-primary/50">—</span>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function DecisionsPage() {
  const queryClient = useQueryClient();
  const { data: decisions, isLoading } = useListDecisions();
  const simulate = useSimulateDecision();
  const deleteDecision = useDeleteDecision();
  const [question, setQuestion] = useState("");

  const refresh = () => queryClient.invalidateQueries({ queryKey: getListDecisionsQueryKey() });

  const handleSimulate = async () => {
    if (!question.trim()) return;
    await simulate.mutateAsync({ data: { question: question.trim() } });
    setQuestion("");
    refresh();
  };

  const handleDelete = async (id: number) => {
    const decision = decisions?.find((d) => d.id === id);

    const confirmed = window.confirm(
      `Are you sure you want to delete "${decision?.question || "this decision"}"?`,
    );

    if (!confirmed) return;

    await deleteDecision.mutateAsync({ id });
    refresh();
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight neon-text flex items-center gap-3">
        <SplitSquareHorizontal className="text-secondary" />
        Decision Simulator
      </h1>

      <div className="glass-card p-6 rounded-xl space-y-4">
        <Textarea
          placeholder="Describe a decision to simulate (e.g. Should we expand to a new market next quarter?)"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          className="min-h-[80px]"
        />
        <Button onClick={handleSimulate} disabled={!question.trim() || simulate.isPending}>
          {simulate.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Simulating...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" /> Simulate Decision
            </>
          )}
        </Button>
      </div>

      {isLoading ? (
        <div>Loading...</div>
      ) : (
        <div className="space-y-4">
          {decisions?.map((d) => (
            <div key={d.id} className="glass-card p-6 rounded-xl space-y-5">
              <div className="flex items-start justify-between gap-4">
                <h3 className="text-lg font-bold">{d.question}</h3>
                <Button variant="destructive" size="icon" onClick={() => handleDelete(d.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <Meter label="Confidence" value={d.confidence} />
                <Meter label="Success Probability" value={d.successProbability} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <List title="Pros" items={d.pros} icon={ThumbsUp} color="text-emerald-400" />
                <List title="Cons" items={d.cons} icon={ThumbsDown} color="text-rose-400" />
                <List title="Risks" items={d.risks} icon={AlertTriangle} color="text-amber-400" />
                <List title="Opportunities" items={d.opportunities} icon={Lightbulb} color="text-sky-400" />
              </div>

              {d.prediction && (
                <div className="bg-white/5 border border-white/10 rounded-lg p-4 text-sm">
                  <span className="text-muted-foreground">Prediction: </span>
                  {d.prediction}
                </div>
              )}
              {d.recommendedAction && (
                <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 text-sm flex gap-2">
                  <Target className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <span>
                    <span className="text-primary font-semibold">Recommended: </span>
                    {d.recommendedAction}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}