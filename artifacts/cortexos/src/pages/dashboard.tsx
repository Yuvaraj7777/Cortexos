import { useGetAnalyticsDashboard, useGetKnowledgeHealth, useGetNoteStats } from "@workspace/api-client-react";
import {
  Activity,
  Brain,
  CheckCircle2,
  FileText,
  Files,
  FolderGit2,
  Network,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  RadialBarChart,
  RadialBar,
  PolarAngleAxis,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
} from "recharts";

const CYAN = "hsl(180, 100%, 50%)";
const PURPLE = "hsl(270, 100%, 60%)";

// Neon palette cycled across topic rings — distinct, on-theme hues.
const TOPIC_COLORS = [
  "hsl(180, 100%, 50%)",
  "hsl(270, 100%, 65%)",
  "hsl(210, 100%, 62%)",
  "hsl(320, 100%, 62%)",
  "hsl(160, 100%, 50%)",
  "hsl(240, 100%, 70%)",
  "hsl(295, 100%, 64%)",
  "hsl(190, 100%, 55%)",
];

const tooltipStyle = {
  background: "hsl(240, 10%, 8%)",
  border: "1px solid hsl(240, 10%, 18%)",
  borderRadius: "0.5rem",
  fontSize: "0.75rem",
  color: "#fff",
} as const;

function shortDate(d: string): string {
  return d.length >= 10 ? d.slice(5) : d;
}

export default function DashboardPage() {
  const { data: dashboard, isLoading: dashLoading } = useGetAnalyticsDashboard();
  const { data: health, isLoading: healthLoading } = useGetKnowledgeHealth();
  const { data: noteStats, isLoading: statsLoading } = useGetNoteStats();

  if (dashLoading || healthLoading || statsLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">System Status</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32 rounded-xl bg-card border border-white/5" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-80 rounded-xl bg-card border border-white/5" />
          <Skeleton className="h-80 rounded-xl bg-card border border-white/5" />
        </div>
      </div>
    );
  }

  const dailyRecords = (dashboard?.dailyRecords ?? []).map((d) => ({ ...d, date: shortDate(d.date) }));
  const activityTrend = (dashboard?.activityTrend ?? []).map((d) => ({ ...d, date: shortDate(d.date) }));
  const knowledgeGrowth = (dashboard?.knowledgeGrowth ?? []).map((d) => ({ ...d, date: shortDate(d.date) }));
  const topicDistribution = dashboard?.topicDistribution ?? [];

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight neon-text flex items-center gap-3">
          <Activity className="text-primary" />
          System Status
        </h1>
        <p className="text-muted-foreground">Neural network operating at nominal capacity.</p>
      </div>

      {/* Primary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Knowledge Nodes" value={dashboard?.totalNotes || 0} icon={FileText} color="primary" />
        <StatCard title="Documents" value={dashboard?.totalDocuments || 0} icon={Files} color="secondary" />
        <StatCard title="Active Projects" value={dashboard?.totalProjects || 0} icon={FolderGit2} color="primary" />
        <StatCard title="Pending Tasks" value={dashboard?.totalTasks || 0} icon={CheckCircle2} color="secondary" />
      </div>

      {/* Daily records: notes vs documents added per day */}
      <ChartCard
        title="Daily Records"
        subtitle="Notes and documents added per day (last 14 days)"
        icon={FileText}
      >
        <ResponsiveContainer width="100%" height={130}>
          <BarChart data={dailyRecords} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(240,10%,16%)" vertical={false} />
            <XAxis dataKey="date" stroke="hsl(215,15%,55%)" fontSize={11} tickLine={false} axisLine={false} />
            <YAxis stroke="hsl(215,15%,55%)" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
            <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "hsl(240,10%,14%)" }} />
            <Legend wrapperStyle={{ fontSize: "0.75rem" }} />
            <Bar dataKey="notes" name="Notes" fill={CYAN} radius={[3, 3, 0, 0]} maxBarSize={22} />
            <Bar dataKey="documents" name="Documents" fill={PURPLE} radius={[3, 3, 0, 0]} maxBarSize={22} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Activity trend */}
        <ChartCard title="Activity Trend" subtitle="All knowledge created per day" icon={Activity}>
          <ResponsiveContainer width="100%" height={120}>
            <AreaChart data={activityTrend} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <defs>
                <linearGradient id="actFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={CYAN} stopOpacity={0.5} />
                  <stop offset="100%" stopColor={CYAN} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(240,10%,16%)" vertical={false} />
              <XAxis dataKey="date" stroke="hsl(215,15%,55%)" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="hsl(215,15%,55%)" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ stroke: CYAN, strokeOpacity: 0.3 }} />
              <Area type="monotone" dataKey="count" name="Items" stroke={CYAN} strokeWidth={2} fill="url(#actFill)" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Knowledge growth */}
        <ChartCard title="Knowledge Growth" subtitle="Cumulative notes over time" icon={Network}>
          <ResponsiveContainer width="100%" height={120}>
            <LineChart data={knowledgeGrowth} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(240,10%,16%)" vertical={false} />
              <XAxis dataKey="date" stroke="hsl(215,15%,55%)" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="hsl(215,15%,55%)" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ stroke: PURPLE, strokeOpacity: 0.3 }} />
              <Line type="monotone" dataKey="count" name="Total notes" stroke={PURPLE} strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Topic distribution */}
        <div className="lg:col-span-2">
          <ChartCard title="Topic Orbitals" subtitle="Ring length = note count per topic. Hover a ring or read the list for exact figures." icon={Network}>
            {topicDistribution.length > 0 ? (
              <div className="flex flex-col lg:flex-row items-center gap-6">
                <div className="relative shrink-0">
                  <RadialBarChart
                    width={260}
                    height={260}
                    data={topicDistribution}
                    innerRadius="28%"
                    outerRadius="100%"
                    startAngle={90}
                    endAngle={-270}
                    barSize={13}
                  >
                    <PolarAngleAxis
                      type="number"
                      domain={[0, Math.max(...topicDistribution.map((t) => t.count))]}
                      tick={false}
                      axisLine={false}
                    />
                    <RadialBar
                      dataKey="count"
                      background={{ fill: "hsl(240,10%,13%)" }}
                      cornerRadius={7}
                    >
                      {topicDistribution.map((_, i) => (
                        <Cell key={i} fill={TOPIC_COLORS[i % TOPIC_COLORS.length]} />
                      ))}
                    </RadialBar>
                    <Tooltip
                      cursor={false}
                      content={({ active, payload }) => {
                        if (!active || !payload || payload.length === 0) return null;
                        const entry = payload[0]?.payload as { topic: string; count: number };
                        const total = topicDistribution.reduce((s, t) => s + t.count, 0) || 1;
                        const idx = topicDistribution.findIndex((t) => t.topic === entry.topic);
                        const color = TOPIC_COLORS[idx % TOPIC_COLORS.length];
                        return (
                          <div style={tooltipStyle} className="px-3 py-2">
                            <div className="flex items-center gap-2 font-semibold">
                              <span
                                className="h-2.5 w-2.5 rounded-full"
                                style={{ backgroundColor: color }}
                              />
                              {entry.topic}
                            </div>
                            <div className="mt-1 text-muted-foreground">
                              {entry.count} {entry.count === 1 ? "note" : "notes"} ·{" "}
                              {Math.round((entry.count / total) * 100)}% of tagged
                            </div>
                          </div>
                        );
                      }}
                    />
                  </RadialBarChart>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">
                      {topicDistribution.length}
                    </span>
                    <span className="text-[0.65rem] uppercase tracking-widest text-muted-foreground">
                      topics
                    </span>
                  </div>
                </div>

                <div className="flex-1 w-full self-center">
                  <div className="flex items-center justify-between text-[0.65rem] uppercase tracking-widest text-muted-foreground mb-2 px-1">
                    <span>Topic</span>
                    <span>Notes / Share</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
                    {topicDistribution.map((t, i) => {
                      const total = topicDistribution.reduce((s, x) => s + x.count, 0) || 1;
                      const pct = Math.round((t.count / total) * 100);
                      return (
                        <div
                          key={t.topic}
                          className="flex items-center gap-2.5 min-w-0 py-1 border-b border-white/5"
                        >
                          <span className="text-xs font-mono text-muted-foreground/60 w-4 shrink-0">
                            {i + 1}
                          </span>
                          <span
                            className="h-2.5 w-2.5 rounded-full shrink-0 shadow-[0_0_8px_currentColor]"
                            style={{
                              backgroundColor: TOPIC_COLORS[i % TOPIC_COLORS.length],
                              color: TOPIC_COLORS[i % TOPIC_COLORS.length],
                            }}
                          />
                          <span className="text-sm truncate flex-1">{t.topic}</span>
                          <span className="text-sm font-mono font-semibold tabular-nums">
                            {t.count}
                          </span>
                          <span className="text-xs font-mono text-muted-foreground w-9 text-right tabular-nums">
                            {pct}%
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-40 flex items-center justify-center text-sm text-muted-foreground italic">
                Insufficient data for topic modeling. Add tagged notes to populate this chart.
              </div>
            )}
          </ChartCard>
        </div>

        {/* Health Panel */}
        <div className="glass-card rounded-xl border border-white/10 overflow-hidden flex flex-col">
          <div className="p-6 border-b border-white/10 flex items-center justify-between bg-card/40">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Brain className="text-primary h-5 w-5" />
              Cognitive Health
            </h2>
            <div className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">
              {health?.score || 0}%
            </div>
          </div>
          <div className="p-6 grid grid-cols-2 gap-4 flex-1">
            <HealthMetric label="Coverage" value={health?.coverage || 0} />
            <HealthMetric label="Consistency" value={health?.consistency || 0} />
            <HealthMetric label="Freshness" value={health?.freshness || 0} />
            <HealthMetric label="Connectivity" value={health?.connectivity || 0} />
          </div>
          <div className="px-6 pb-6 space-y-3">
            <div className="flex justify-between items-center bg-white/5 p-3 rounded-md">
              <span className="text-sm flex items-center gap-2"><ShieldAlert size={14} /> Contradictions</span>
              <span className="font-mono text-destructive font-bold">{dashboard?.contradictionsFound || 0}</span>
            </div>
            <div className="flex justify-between items-center bg-white/5 p-3 rounded-md">
              <span className="text-sm flex items-center gap-2"><Sparkles size={14} /> AI Consultations</span>
              <span className="font-mono text-secondary font-bold">{dashboard?.aiQueriesCount || 0}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ChartCard({
  title,
  subtitle,
  icon: Icon,
  children,
}: {
  title: string;
  subtitle: string;
  icon: any;
  children: React.ReactNode;
}) {
  return (
    <div className="glass-card rounded-xl border border-white/10 p-6">
      <div className="flex items-center gap-2 mb-1">
        <Icon className="text-primary h-5 w-5" />
        <h2 className="text-lg font-bold">{title}</h2>
      </div>
      <p className="text-xs text-muted-foreground mb-4">{subtitle}</p>
      {children}
    </div>
  );
}

function StatCard({ title, value, icon: Icon, color }: { title: string, value: number, icon: any, color: "primary" | "secondary" }) {
  const isPrimary = color === "primary";
  return (
    <div className={`glass-card p-5 rounded-xl border-l-2 ${isPrimary ? "border-l-primary" : "border-l-secondary"} relative overflow-hidden group`}>
      <div className={`absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity ${isPrimary ? "text-primary" : "text-secondary"}`}>
        <Icon size={48} />
      </div>
      <div className="text-sm font-medium text-muted-foreground mb-2">{title}</div>
      <div className="text-3xl font-black font-mono">{value}</div>
    </div>
  );
}

function HealthMetric({ label, value }: { label: string, value: number }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className="flex items-end gap-1">
        <span className="text-2xl font-bold font-mono">{value}</span>
        <span className="text-xs text-muted-foreground mb-1">%</span>
      </div>
      <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-primary to-secondary rounded-full"
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}
