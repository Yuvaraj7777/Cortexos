import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListContradictions,
  useDetectContradictions,
  getListContradictionsQueryKey,
} from "@workspace/api-client-react";
import {
  BrainCircuit,
  ScanSearch,
  Loader2,
  AlertTriangle,
  ArrowLeftRight,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from "recharts";

const RED = "hsl(0, 84%, 60%)";
const AMBER = "hsl(38, 92%, 50%)";
const CYAN = "hsl(180, 100%, 50%)";

const tooltipStyle = {
  background: "hsl(240, 10%, 8%)",
  border: "1px solid hsl(240, 10%, 18%)",
  borderRadius: "0.5rem",
  fontSize: "0.75rem",
  color: "#fff",
} as const;

type Severity = { label: string; color: string; classes: string };

function severityOf(confidence: number): Severity {
  if (confidence >= 75)
    return { label: "High", color: RED, classes: "border-destructive/30 bg-destructive/10 text-destructive" };
  if (confidence >= 50)
    return { label: "Medium", color: AMBER, classes: "border-amber-400/30 bg-amber-400/10 text-amber-400" };
  return { label: "Low", color: CYAN, classes: "border-primary/30 bg-primary/10 text-primary" };
}

export default function ContradictionsPage() {
  const queryClient = useQueryClient();
  const { data: contradictions, isLoading } = useListContradictions();
  const detect = useDetectContradictions();
  const [claim, setClaim] = useState("");

  const runDetect = async (data: { claim?: string } = {}) => {
    try {
      await detect.mutateAsync({ data });
      queryClient.invalidateQueries({ queryKey: getListContradictionsQueryKey() });
      return true;
    } catch {
      toast({
        variant: "destructive",
        title: "Detection failed",
        description: "The analysis could not complete. Please try again.",
      });
      return false;
    }
  };

  const handleScan = () => runDetect();

  const handleCheckClaim = async () => {
    const trimmed = claim.trim();
    if (!trimmed) return;
    const ok = await runDetect({ claim: trimmed });
    if (ok) setClaim("");
  };

  const list = contradictions ?? [];
  const total = list.length;
  const avgConfidence =
    total > 0 ? Math.round(list.reduce((s, c) => s + c.confidence, 0) / total) : 0;
  const highCount = list.filter((c) => c.confidence >= 75).length;

  const chartData = list.map((c, i) => ({
    name: `#${i + 1}`,
    pair: `${c.noteATitle} ⇄ ${c.noteBTitle}`,
    confidence: c.confidence,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight neon-text flex items-center gap-3">
          <BrainCircuit className="text-secondary" />
          Contradiction Detector
        </h1>
        <p className="text-muted-foreground mt-1">
          Type a statement to check it against your notes, or scan every note for conflicting claims.
        </p>
      </div>

      <div className="glass-card p-6 rounded-xl space-y-4">
        <Textarea
          placeholder="Type a statement to test (e.g. Remote work lowers team productivity) and we'll find notes that contradict it."
          value={claim}
          onChange={(e) => setClaim(e.target.value)}
          className="min-h-[80px]"
          disabled={detect.isPending}
        />
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            onClick={handleCheckClaim}
            disabled={!claim.trim() || detect.isPending}
            className="flex-1"
          >
            {detect.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Checking...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" /> Check Statement
              </>
            )}
          </Button>
          <Button
            variant="outline"
            onClick={handleScan}
            disabled={detect.isPending}
            className="flex-1"
          >
            <ScanSearch className="mr-2 h-4 w-4" /> Scan All Notes
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div>Loading...</div>
      ) : total === 0 ? (
        <div className="glass-card p-12 rounded-xl text-center">
          <ShieldCheck className="h-10 w-10 text-primary mx-auto mb-3" />
          <p className="text-lg font-semibold">No contradictions on record</p>
          <p className="text-muted-foreground mt-1">
            Run a scan to analyze your notes for conflicting claims.
          </p>
        </div>
      ) : (
        <>
          {/* Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <SummaryCard label="Conflicts Found" value={total} accent="destructive" />
            <SummaryCard label="High Severity" value={highCount} accent="destructive" />
            <SummaryCard label="Avg. Confidence" value={`${avgConfidence}%`} accent="secondary" />
          </div>

          {/* Confidence chart */}
          <div className="glass-card rounded-xl border border-white/10 p-6">
            <h2 className="text-lg font-bold mb-1">Confidence by Conflict</h2>
            <p className="text-xs text-muted-foreground mb-4">
              Each bar is one detected conflict. Taller bars are more likely to be genuine contradictions.
            </p>
            <ResponsiveContainer width="100%" height={Math.max(200, chartData.length * 40)}>
              <BarChart
                data={chartData}
                layout="vertical"
                margin={{ top: 0, right: 24, left: 8, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(240,10%,16%)" horizontal={false} />
                <XAxis
                  type="number"
                  domain={[0, 100]}
                  stroke="hsl(215,15%,55%)"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  unit="%"
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  stroke="hsl(215,15%,55%)"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  width={36}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  cursor={{ fill: "hsl(240,10%,14%)" }}
                  formatter={(value: number) => [`${value}%`, "Confidence"]}
                  labelFormatter={(_label, payload) =>
                    payload?.[0]?.payload?.pair ?? ""
                  }
                />
                <Bar dataKey="confidence" radius={[0, 3, 3, 0]} maxBarSize={24}>
                  {chartData.map((d, i) => (
                    <Cell key={i} fill={severityOf(d.confidence).color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Conflict cards */}
          <div className="space-y-4">
            {list.map((c) => {
              const sev = severityOf(c.confidence);
              return (
                <div key={c.id} className="glass-card p-6 rounded-xl border border-white/10">
                  <div className="flex items-center justify-between gap-4 mb-4">
                    <div className="flex items-center gap-2 font-semibold">
                      <AlertTriangle className="h-4 w-4 text-amber-400" />
                      Conflict Detected
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs border px-2.5 py-1 rounded-full ${sev.classes}`}>
                        {sev.label}
                      </span>
                      <span className="text-xs font-mono text-muted-foreground">
                        {c.confidence}%
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col md:flex-row items-stretch gap-3 mb-4">
                    <div className="flex-1 bg-white/5 border border-white/10 rounded-lg p-3 text-sm font-medium">
                      {c.noteATitle}
                    </div>
                    <div className="flex items-center justify-center text-secondary">
                      <ArrowLeftRight className="h-5 w-5" />
                    </div>
                    <div className="flex-1 bg-white/5 border border-white/10 rounded-lg p-3 text-sm font-medium">
                      {c.noteBTitle}
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">{c.explanation}</p>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number | string;
  accent: "destructive" | "secondary";
}) {
  return (
    <div className="glass-card p-5 rounded-xl border border-white/10">
      <div className="text-sm text-muted-foreground mb-2">{label}</div>
      <div
        className={`text-3xl font-black font-mono ${accent === "destructive" ? "text-destructive" : "text-secondary"}`}
      >
        {value}
      </div>
    </div>
  );
}
