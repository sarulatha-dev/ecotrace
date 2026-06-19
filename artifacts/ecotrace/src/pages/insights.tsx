import { useSessionId } from "@/hooks/use-session";
import { useGetActivitySummary, getGetActivitySummaryQueryKey, useListActivities, getListActivitiesQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CATEGORY_COLORS, CATEGORY_LABELS } from "@/lib/constants";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend, BarChart, Bar, XAxis, YAxis, LineChart, Line, CartesianGrid } from "recharts";
import { Lightbulb, Info } from "lucide-react";
import { cn } from "@/lib/utils";

function ActivityHeatmap({ activities }: { activities: Array<{ loggedAt: string; co2Amount: number }> }) {
  const DAYS = 91;
  const today = new Date();
  today.setHours(23, 59, 59, 999);

  // Build daily totals map
  const dailyMap: Record<string, number> = {};
  activities.forEach((a) => {
    const d = new Date(a.loggedAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    dailyMap[key] = (dailyMap[key] ?? 0) + a.co2Amount;
  });

  // Build array of DAYS days ending today
  const days = Array.from({ length: DAYS }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (DAYS - 1 - i));
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    return { date: d, key, total: dailyMap[key] ?? 0 };
  });

  const max = Math.max(...days.map((d) => d.total), 0.1);

  const getColor = (total: number) => {
    if (total === 0) return "bg-muted/50 dark:bg-muted/20";
    const pct = total / max;
    if (pct < 0.25) return "bg-emerald-200 dark:bg-emerald-900";
    if (pct < 0.5) return "bg-emerald-400 dark:bg-emerald-700";
    if (pct < 0.75) return "bg-amber-400 dark:bg-amber-600";
    return "bg-red-500 dark:bg-red-600";
  };

  // Split into weeks (columns)
  const startDow = days[0].date.getDay(); // 0=Sun
  const cells: (typeof days[0] | null)[] = Array(startDow).fill(null).concat(days);
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: (typeof days[0] | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  const DOW_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

  // Month labels
  const monthLabels: { label: string; col: number }[] = [];
  weeks.forEach((week, wi) => {
    const firstReal = week.find((d) => d !== null);
    if (firstReal && (wi === 0 || firstReal.date.getDate() <= 7)) {
      monthLabels.push({ label: firstReal.date.toLocaleString("default", { month: "short" }), col: wi });
    }
  });

  return (
    <div className="overflow-x-auto">
      <div className="flex gap-3 min-w-max">
        {/* Day-of-week labels */}
        <div className="flex flex-col gap-[3px] pt-6 shrink-0">
          {DOW_LABELS.map((d, i) => (
            <div key={d} className={cn("h-[13px] text-[9px] text-muted-foreground leading-none", i % 2 === 0 ? "opacity-100" : "opacity-0")}>{d}</div>
          ))}
        </div>
        {/* Grid */}
        <div>
          {/* Month row */}
          <div className="flex gap-[3px] mb-1 h-4">
            {weeks.map((_, wi) => {
              const ml = monthLabels.find((m) => m.col === wi);
              return (
                <div key={wi} className="w-[13px] text-[9px] text-muted-foreground leading-none shrink-0">
                  {ml?.label ?? ""}
                </div>
              );
            })}
          </div>
          {/* Squares */}
          <div className="flex gap-[3px]">
            {weeks.map((week, wi) => (
              <div key={wi} className="flex flex-col gap-[3px]">
                {week.map((day, di) => (
                  <div
                    key={di}
                    title={day ? `${day.key}: ${day.total.toFixed(2)} kg CO₂` : ""}
                    className={cn(
                      "w-[13px] h-[13px] rounded-[2px] transition-colors",
                      day ? getColor(day.total) : "opacity-0"
                    )}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
      {/* Legend */}
      <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
        <span>Less</span>
        <div className="w-[13px] h-[13px] rounded-[2px] bg-muted/50" />
        <div className="w-[13px] h-[13px] rounded-[2px] bg-emerald-200 dark:bg-emerald-900" />
        <div className="w-[13px] h-[13px] rounded-[2px] bg-emerald-400 dark:bg-emerald-700" />
        <div className="w-[13px] h-[13px] rounded-[2px] bg-amber-400 dark:bg-amber-600" />
        <div className="w-[13px] h-[13px] rounded-[2px] bg-red-500 dark:bg-red-600" />
        <span>More</span>
      </div>
    </div>
  );
}

export default function Insights() {
  const sessionId = useSessionId();

  const { data: summary, isLoading: summaryLoading } = useGetActivitySummary(
    { sessionId: sessionId!, days: 30 },
    { query: { enabled: !!sessionId, queryKey: getGetActivitySummaryQueryKey({ sessionId: sessionId!, days: 30 }) } }
  );

  const { data: allActivities, isLoading: activitiesLoading } = useListActivities(
    { sessionId: sessionId! },
    { query: { enabled: !!sessionId, queryKey: getListActivitiesQueryKey({ sessionId: sessionId! }) } }
  );

  if (!sessionId || summaryLoading || activitiesLoading) {
    return (
      <div className="p-6 md:p-8 space-y-6 max-w-5xl mx-auto">
        <Skeleton className="h-10 w-48 mb-8" />
        <Skeleton className="h-32" />
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-[400px]" />
          <Skeleton className="h-[400px]" />
        </div>
      </div>
    );
  }

  const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } };
  const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

  const categoryData = summary?.byCategory.map((c) => ({
    name: CATEGORY_LABELS[c.category as keyof typeof CATEGORY_LABELS] || c.category,
    value: c.co2Amount,
    color: CATEGORY_COLORS[c.category as keyof typeof CATEGORY_COLORS]?.replace("text-", "") || "gray-500",
  })) || [];

  const highestCategory = summary?.byCategory.length
    ? summary.byCategory.reduce((prev, cur) => (prev.co2Amount > cur.co2Amount ? prev : cur))
    : null;

  const getTips = (cat: string | null) => {
    switch (cat) {
      case "transport": return ["Try carpooling or public transit once a week.", "Ensure tires are properly inflated.", "Combine errands into a single trip."];
      case "food": return ["Substitute one meat meal per week with a plant-based option.", "Buy local, seasonal produce.", "Plan meals carefully to reduce food waste."];
      case "energy": return ["Switch to LED bulbs throughout your home.", "Adjust thermostat by 1-2°.", "Unplug vampire appliances when not in use."];
      case "shopping": return ["Buy secondhand clothing or electronics.", "Consolidate online orders.", "Invest in high-quality items that last longer."];
      default: return ["Log more activities for personalised recommendations.", "Check out the Challenges page for ideas."];
    }
  };

  const pieColors = ["hsl(var(--primary))", "hsl(var(--accent))", "hsl(var(--chart-3))", "hsl(var(--chart-4))"];

  // Weekly trend: last 8 weeks, grouped by ISO week
  const weeklyTrend = (() => {
    const weeks: { label: string; co2: number }[] = [];
    for (let w = 7; w >= 0; w--) {
      const start = new Date();
      start.setDate(start.getDate() - w * 7 - start.getDay());
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
      const total = (allActivities ?? [])
        .filter((a) => { const d = new Date(a.loggedAt); return d >= start && d <= end; })
        .reduce((s, a) => s + a.co2Amount, 0);
      const label = start.toLocaleDateString(undefined, { month: "short", day: "numeric" });
      weeks.push({ label, co2: +total.toFixed(2) });
    }
    return weeks;
  })();

  return (
    <motion.div className="p-6 md:p-8 space-y-8 max-w-5xl mx-auto" variants={container} initial="hidden" animate="show">
      <div>
        <motion.h1 variants={item} className="text-3xl font-bold tracking-tight">Insights & Analytics</motion.h1>
        <motion.p variants={item} className="text-muted-foreground mt-1">Deep dive into your impact history.</motion.p>
      </div>

      {/* Heatmap */}
      <motion.div variants={item}>
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Activity Heatmap</CardTitle>
            <CardDescription>Daily CO₂ emissions over the past 91 days. Darker = more emissions.</CardDescription>
          </CardHeader>
          <CardContent>
            {(allActivities?.length ?? 0) === 0 ? (
              <div className="flex items-center justify-center h-24 text-muted-foreground text-sm flex-col gap-2">
                <Info className="h-5 w-5 opacity-40" />
                Log activities to populate the heatmap
              </div>
            ) : (
              <ActivityHeatmap activities={allActivities ?? []} />
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Weekly trend line */}
      <motion.div variants={item}>
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Weekly CO₂ Trend</CardTitle>
            <CardDescription>Your total emissions per week over the past 8 weeks — see if you're improving.</CardDescription>
          </CardHeader>
          <CardContent className="h-[240px]">
            {weeklyTrend.every((w) => w.co2 === 0) ? (
              <div className="h-full flex items-center justify-center text-muted-foreground text-sm flex-col gap-2">
                <Info className="h-5 w-5 opacity-40" />
                Log activities to populate the trend line
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={weeklyTrend} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="label" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}kg`} />
                  <RechartsTooltip
                    formatter={(v: number) => [`${v.toFixed(2)} kg CO₂`, "Weekly total"]}
                    contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }}
                    labelStyle={{ color: "hsl(var(--foreground))", fontWeight: 600 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="co2"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2.5}
                    dot={{ fill: "hsl(var(--primary))", r: 4, strokeWidth: 0 }}
                    activeDot={{ r: 6, fill: "#ff7a00", strokeWidth: 0 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Tips */}
      {highestCategory && (
        <motion.div variants={item}>
          <div className="bg-accent/10 border border-accent/20 rounded-2xl p-6 flex flex-col md:flex-row gap-6 items-start shadow-sm">
            <div className="bg-accent text-accent-foreground p-3 rounded-full shrink-0">
              <Lightbulb className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-accent-foreground mb-2">
                Focus Area: {CATEGORY_LABELS[highestCategory.category as keyof typeof CATEGORY_LABELS]}
              </h3>
              <p className="text-muted-foreground mb-4 text-sm leading-relaxed max-w-2xl">
                This category makes up <span className="font-bold text-foreground">{Math.round(highestCategory.percentage)}%</span> of your recent carbon footprint.
              </p>
              <ul className="space-y-2">
                {getTips(highestCategory.category).map((tip, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-foreground/80">
                    <span className="text-accent mt-0.5">•</span>
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </motion.div>
      )}

      {/* Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        <motion.div variants={item}>
          <Card className="h-full shadow-sm">
            <CardHeader>
              <CardTitle>Emission Sources</CardTitle>
              <CardDescription>Breakdown by category (30 days)</CardDescription>
            </CardHeader>
            <CardContent className="h-[300px]">
              {categoryData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={categoryData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={2} dataKey="value" stroke="none">
                      {categoryData.map((_, index) => (
                        <Cell key={index} fill={pieColors[index % pieColors.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip formatter={(v: number) => [`${v.toFixed(1)} kg CO₂`, "Emissions"]} contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))" }} />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground text-sm flex-col gap-2">
                  <Info className="h-5 w-5 opacity-50" /> No data yet
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card className="h-full shadow-sm">
            <CardHeader>
              <CardTitle>Daily Averages</CardTitle>
              <CardDescription>Your average vs global baseline</CardDescription>
            </CardHeader>
            <CardContent className="h-[300px] pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={[
                    { name: "Your Avg", value: summary?.dailyAverage || 0 },
                    { name: "Global Avg", value: summary?.globalAverage || 0 },
                  ]}
                  layout="vertical"
                  margin={{ top: 0, right: 30, left: 20, bottom: 0 }}
                  barSize={40}
                >
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: "hsl(var(--foreground))", fontWeight: 500 }} />
                  <RechartsTooltip cursor={{ fill: "transparent" }} formatter={(v: number) => [`${v.toFixed(1)} kg`, "Daily CO₂"]} contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))" }} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {[0, 1].map((_, index) => (
                      <Cell key={index} fill={index === 0 ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
}
