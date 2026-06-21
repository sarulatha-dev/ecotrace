import React, { useState } from "react";
import { useSessionId } from "@/hooks/use-session";
import { useGetActivitySummary, getGetActivitySummaryQueryKey, useListActivities, getListActivitiesQueryKey } from "@workspace/api-client-react";
import { CATEGORY_COLORS } from "@/lib/constants";
import { Skeleton } from "@/components/ui/skeleton";
import { motion, AnimatePresence } from "framer-motion";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend, BarChart, Bar, XAxis, YAxis, LineChart, Line, CartesianGrid } from "recharts";
import { Lightbulb, Info, MapPin, CheckCircle, PlusCircle, Calendar, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { MapContainer, TileLayer, Polyline, CircleMarker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";

// Fix Leaflet container positioning
const MAP_TILE_URL = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";

interface RouteData {
  name: string;
  coords: [number, number][];
  co2: number;
  level: "low" | "medium" | "high";
  mode: string;
}

const TRAVEL_ROUTES: RouteData[] = [
  { name: "London ➔ Paris", coords: [[51.5074, -0.1278], [48.8566, 2.3522]], co2: 45, level: "low", mode: "Train" },
  { name: "New York ➔ Washington DC", coords: [[40.7128, -74.0060], [38.9072, -77.0369]], co2: 32, level: "low", mode: "Bus" },
  { name: "San Francisco ➔ Los Angeles", coords: [[37.7749, -122.4194], [34.0522, -118.2437]], co2: 110, level: "medium", mode: "Flight" },
  { name: "Delhi ➔ Mumbai", coords: [[28.6139, 77.2090], [19.0760, 72.8777]], co2: 195, level: "high", mode: "Flight" },
  { name: "Tokyo ➔ Osaka", coords: [[35.6762, 139.6503], [34.6937, 135.5023]], co2: 65, level: "medium", mode: "Bullet Train" },
];

function ActivityHeatmap({ activities }: { activities: Array<{ loggedAt: string; co2Amount: number }> }) {
  const { t } = useTranslation();
  const DAYS = 91;
  const today = new Date();
  today.setHours(23, 59, 59, 999);

  const dailyMap: Record<string, number> = {};
  activities.forEach((a) => {
    const d = new Date(a.loggedAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    dailyMap[key] = (dailyMap[key] ?? 0) + a.co2Amount;
  });

  const days = Array.from({ length: DAYS }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (DAYS - 1 - i));
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    return { date: d, key, total: dailyMap[key] ?? 0 };
  });

  const max = Math.max(...days.map((d) => d.total), 0.1);

  const getColor = (total: number) => {
    if (total === 0) return "bg-muted/50 dark:bg-white/5";
    const pct = total / max;
    if (pct < 0.25) return "bg-emerald-500/30 border border-emerald-500/20";
    if (pct < 0.5) return "bg-emerald-500/60";
    if (pct < 0.75) return "bg-amber-500/70";
    return "bg-red-500/80";
  };

  const startDow = days[0].date.getDay();
  const cells: (typeof days[0] | null)[] = Array(startDow).fill(null).concat(days);
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: (typeof days[0] | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  const DOW_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

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
        <div className="flex flex-col gap-[3px] pt-6 shrink-0">
          {DOW_LABELS.map((d, i) => (
            <div key={d} className={cn("h-[13px] text-[9px] text-muted-foreground leading-none", i % 2 === 0 ? "opacity-100" : "opacity-0")}>{d}</div>
          ))}
        </div>
        <div>
          <div className="flex gap-[3px] mb-1 h-4">
            {weeks.map((_, wi) => {
              const ml = monthLabels.find((m) => m.col === wi);
              return (
                <div key={wi} className="w-[13px] text-[9px] text-muted-foreground leading-none shrink-0 font-medium">
                  {ml?.label ?? ""}
                </div>
              );
            })}
          </div>
          <div className="flex gap-[3px]">
            {weeks.map((week, wi) => (
              <div key={wi} className="flex flex-col gap-[3px]">
                {week.map((day, di) => (
                  <div
                    key={di}
                    title={day ? `${day.key}: ${day.total.toFixed(2)} kg CO₂` : ""}
                    className={cn(
                      "w-[13px] h-[13px] rounded-[2px] transition-all duration-200 hover:scale-110",
                      day ? getColor(day.total) : "opacity-0"
                    )}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
        <span>{t("insightsPage.less")}</span>
        <div className="w-[13px] h-[13px] rounded-[2px] bg-muted/40" />
        <div className="w-[13px] h-[13px] rounded-[2px] bg-emerald-500/30" />
        <div className="w-[13px] h-[13px] rounded-[2px] bg-emerald-500/60" />
        <div className="w-[13px] h-[13px] rounded-[2px] bg-amber-500/70" />
        <div className="w-[13px] h-[13px] rounded-[2px] bg-red-500/80" />
        <span>{t("insightsPage.more")}</span>
      </div>
    </div>
  );
}

export default function Insights() {
  const { t } = useTranslation();
  const sessionId = useSessionId();
  const [timeframe, setTimeframe] = useState<"weekly" | "monthly">("weekly");
  const [suggestionFilter, setSuggestionFilter] = useState<string>("all");
  const [completedTips, setCompletedTips] = useState<Record<number, boolean>>({});

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
      <div className="p-4 md:p-6 space-y-4 max-w-5xl mx-auto">
        <Skeleton className="h-10 w-48 mb-4 bg-muted" />
        <Skeleton className="h-32 bg-muted" />
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-[200px] bg-muted" />
          <Skeleton className="h-[200px] bg-muted" />
        </div>
      </div>
    );
  }

  const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } };
  const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

  const categoryData = summary?.byCategory.map((c) => ({
    name: t(`logActivity.categories.${c.category}`) || c.category,
    value: c.co2Amount,
    color: CATEGORY_COLORS[c.category as keyof typeof CATEGORY_COLORS]?.replace("text-", "") || "gray-500",
  })) || [];

  const highestCategory = summary?.byCategory.length
    ? summary.byCategory.reduce((prev, cur) => (prev.co2Amount > cur.co2Amount ? prev : cur))
    : null;

  const getTips = (cat: string | null) => {
    const key = cat && ["transport", "food", "energy", "shopping"].includes(cat) ? cat : "default";
    return [
      t(`insightsPage.tips.${key}.0`),
      t(`insightsPage.tips.${key}.1`),
      t(`insightsPage.tips.${key}.2`)
    ].filter(Boolean);
  };

  const pieColors = ["#10b981", "#f59e0b", "#3b82f6", "#ec4899"];

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

  const monthlyTrend = (() => {
    const months: { label: string; co2: number }[] = [];
    for (let m = 5; m >= 0; m--) {
      const start = new Date();
      start.setMonth(start.getMonth() - m);
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start.getFullYear(), start.getMonth() + 1, 0);
      end.setHours(23, 59, 59, 999);
      const total = (allActivities ?? [])
        .filter((a) => { const d = new Date(a.loggedAt); return d >= start && d <= end; })
        .reduce((s, a) => s + a.co2Amount, 0);
      const label = start.toLocaleDateString(undefined, { month: "short" });
      months.push({ label, co2: +total.toFixed(2) });
    }
    return months;
  })();

  const activeTrendData = timeframe === "weekly" ? weeklyTrend : monthlyTrend;

  // AI smart suggestions static store
  const smartSuggestions = [
    { id: 1, category: "transport", title: "Carpool & Transit", impact: "High Impact", difficulty: "medium", co2Saved: 35, tip: "Substitute single occupant car trips with transit or sharing." },
    { id: 2, category: "energy", title: "Smart Thermostat Shift", impact: "High Impact", difficulty: "easy", co2Saved: 18, tip: "Shift AC temperature by 1-2 degrees when sleeping." },
    { id: 3, category: "food", title: "Meatless Mondays", impact: "Medium Impact", difficulty: "easy", co2Saved: 12, tip: "Swap beef or pork meals for healthy plant-based meals once a week." },
    { id: 4, category: "shopping", title: "Refurbished Tech", impact: "Medium Impact", difficulty: "medium", co2Saved: 25, tip: "Buy refurbished devices to save e-waste and supply chain emissions." },
    { id: 5, category: "energy", title: "LED Retrofitting", impact: "Low Impact", difficulty: "easy", co2Saved: 8, tip: "Retrofit halogen lights with energy efficient LED bulbs." },
  ];

  const filteredSuggestions = smartSuggestions.filter(s => {
    if (suggestionFilter === "all") return true;
    return s.category === suggestionFilter || s.difficulty === suggestionFilter;
  });

  return (
    <motion.div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto animate-fade-in" variants={container} initial="hidden" animate="show">
      <div>
        <motion.h1 variants={item} className="text-2xl font-bold tracking-tight text-foreground">{t("insightsPage.title")}</motion.h1>
        <motion.p variants={item} className="text-muted-foreground text-sm mt-0.5">{t("insightsPage.desc")}</motion.p>
      </div>

      {/* Heatmap */}
      <motion.div variants={item}>
        <div className="saas-card">
          <div className="mb-3 flex justify-between items-center">
            <div>
              <h3 className="text-base font-semibold leading-none tracking-tight text-foreground">{t("insightsPage.activityHeatmap")}</h3>
              <p className="text-xs text-muted-foreground mt-1">{t("insightsPage.heatmapDesc")}</p>
            </div>
          </div>
          <div>
            {(allActivities?.length ?? 0) === 0 ? (
              <div className="flex items-center justify-center h-24 text-muted-foreground text-sm flex-col gap-2">
                <Info className="h-5 w-5 opacity-40" />
                {t("insightsPage.heatmapEmpty")}
              </div>
            ) : (
              <ActivityHeatmap activities={allActivities ?? []} />
            )}
          </div>
        </div>
      </motion.div>

      {/* Trend line and map Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Weekly/Monthly trend line */}
        <motion.div variants={item} className="saas-card flex flex-col justify-between">
          <div>
            <div className="mb-4 flex justify-between items-center">
              <div>
                <h3 className="text-base font-semibold leading-none tracking-tight text-foreground">{t("insightsPage.weeklyTrend")}</h3>
                <p className="text-xs text-muted-foreground mt-1">{t("insightsPage.weeklyTrendDesc")}</p>
              </div>
              <div className="flex items-center gap-1.5 bg-muted border border-border p-0.5 rounded-lg">
                <button
                  onClick={() => setTimeframe("weekly")}
                  className={cn("px-2.5 py-1 text-[10px] rounded-md font-semibold transition-all", timeframe === "weekly" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
                >
                  Weekly
                </button>
                <button
                  onClick={() => setTimeframe("monthly")}
                  className={cn("px-2.5 py-1 text-[10px] rounded-md font-semibold transition-all", timeframe === "monthly" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
                >
                  Monthly
                </button>
              </div>
            </div>
            <div className="h-[200px] w-full">
              {activeTrendData.every((w) => w.co2 === 0) ? (
                <div className="h-full flex items-center justify-center text-muted-foreground text-sm flex-col gap-2">
                  <Info className="h-5 w-5 opacity-40" />
                  {t("insightsPage.trendEmpty")}
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={activeTrendData} margin={{ top: 8, right: 16, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />
                    <XAxis dataKey="label" tick={{ fill: "var(--color-muted-foreground)", fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "var(--color-muted-foreground)", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}kg`} />
                    <RechartsTooltip
                      formatter={(v: number) => [`${v.toFixed(2)} kg CO₂`, timeframe === "weekly" ? t("insightsPage.weeklyTotal") : "Monthly Total"]}
                      contentStyle={{ borderRadius: "12px", border: "1px solid var(--color-border)", background: "var(--color-card)", fontSize: 11, color: "var(--color-foreground)" }}
                      labelStyle={{ color: "var(--color-foreground)", fontWeight: 600 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="co2"
                      stroke="#10b981"
                      strokeWidth={3}
                      dot={{ fill: "#10b981", r: 4, strokeWidth: 0 }}
                      activeDot={{ r: 6, fill: "#f59e0b", strokeWidth: 0 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </motion.div>

        {/* Travel impact map */}
        <motion.div variants={item} className="saas-card overflow-hidden flex flex-col justify-between">
          <div>
            <h3 className="text-base font-semibold leading-none tracking-tight text-foreground mb-1 flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-emerald-500" />
              Travel Impact Route Map
            </h3>
            <p className="text-xs text-muted-foreground mb-3">Geographic travel corridors mapped with CO₂ emissions.</p>
          </div>
          <div className="h-[200px] w-full rounded-xl overflow-hidden border border-border relative shadow-inner">
            <MapContainer center={[35, 10]} zoom={1.5} style={{ height: "100%", width: "100%", background: "#F6FFF9" }} scrollWheelZoom={false}>
              <TileLayer
                attribution='&copy; CARTO'
                url={MAP_TILE_URL}
              />
              {TRAVEL_ROUTES.map((route, idx) => {
                const color = route.level === "high" ? "#ef4444" : route.level === "medium" ? "#f59e0b" : "#10b981";
                return (
                  <React.Fragment key={idx}>
                    <Polyline positions={route.coords} color={color} weight={3} dashArray="6, 6">
                      <Popup>
                        <div className="text-xs font-semibold p-1">
                          <p className="font-bold border-b pb-1 mb-1 text-slate-800">{route.name}</p>
                          <p className="text-slate-700">Mode: {route.mode}</p>
                          <p className="text-slate-700">Emissions: {route.co2} kg CO₂</p>
                          <p className="capitalize font-bold mt-1" style={{ color }}>{route.level} impact</p>
                        </div>
                      </Popup>
                    </Polyline>
                    <CircleMarker center={route.coords[0]} color={color} radius={4} fillOpacity={0.8} />
                    <CircleMarker center={route.coords[1]} color={color} radius={4} fillOpacity={0.8} />
                  </React.Fragment>
                );
              })}
            </MapContainer>
          </div>
        </motion.div>
      </div>

      {/* AI Smart suggestions board */}
      <motion.div variants={item} className="saas-card">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/40 pb-4 mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-emerald-500" />
            <div>
              <h3 className="text-base font-bold text-foreground">Smart Suggestions Panel</h3>
              <p className="text-xs text-muted-foreground">Personalised AI actions matching your emission sources</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {[
              { id: "all", label: "All Suggestions" },
              { id: "transport", label: "🚗 Transport" },
              { id: "energy", label: "⚡ Energy" },
              { id: "food", label: "🥩 Diet" },
              { id: "easy", label: "Easy Win" },
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setSuggestionFilter(f.id)}
                className={cn("px-2.5 py-1 text-[10px] rounded-lg border font-semibold transition-all", suggestionFilter === f.id ? "bg-primary/20 border-primary/45 text-primary" : "bg-muted border-border text-muted-foreground hover:text-foreground")}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filteredSuggestions.map(s => {
            const completed = completedTips[s.id];
            return (
              <div key={s.id} className="bg-card border border-border rounded-xl p-3 flex flex-col justify-between hover:border-primary/40 transition-all duration-200">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-primary">{s.impact}</span>
                    <span className={cn("text-[9px] px-2 py-0.5 rounded-full font-bold uppercase", s.difficulty === "easy" ? "bg-primary/10 text-primary border border-primary/20" : "bg-amber-100 text-amber-700 border border-amber-200")}>
                      {s.difficulty}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-foreground mb-1">{s.title}</h4>
                  <p className="text-[10px] text-muted-foreground leading-relaxed mb-3">{s.tip}</p>
                </div>
                <div className="flex items-center justify-between border-t border-border/40 pt-2.5 mt-2">
                  <span className="text-[10px] font-bold text-primary">-{s.co2Saved} kg CO₂</span>
                  <button
                    onClick={() => setCompletedTips(prev => ({ ...prev, [s.id]: !prev[s.id] }))}
                    className="flex items-center gap-1 text-[9px] font-bold px-2 py-1 rounded-md bg-muted border border-border text-foreground/80 hover:bg-primary hover:text-primary-foreground transition-all"
                  >
                    {completed ? <CheckCircle className="w-2.5 h-2.5 text-primary fill-primary/20" /> : <PlusCircle className="w-2.5 h-2.5" />}
                    {completed ? "Completed" : "Add Task"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* Focus Area tips */}
      {highestCategory && (
        <motion.div variants={item}>
          <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 flex flex-col md:flex-row gap-4 items-start shadow-md transition-all duration-300">
            <div className="bg-primary text-primary-foreground p-2 rounded-full shrink-0 animate-bounce">
              <Lightbulb className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-primary mb-1">
                {t("insightsPage.focusArea", { category: t(`logActivity.categories.${highestCategory.category}`) })}
              </h3>
              <p className="text-muted-foreground mb-3 text-xs leading-relaxed max-w-2xl">
                {t("insightsPage.focusAreaDesc", { percentage: Math.round(highestCategory.percentage) })}
              </p>
              <ul className="space-y-1.5">
                {getTips(highestCategory.category).map((tip, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-foreground/80">
                    <span className="text-primary mt-0.5">•</span>
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </motion.div>
      )}

      {/* Emission Source Breakdown & Averages */}
      <div className="grid gap-6 md:grid-cols-2">
        <motion.div variants={item}>
          <div className="saas-card h-full">
            <div className="mb-3">
              <h3 className="text-base font-semibold leading-none tracking-tight text-foreground">{t("insightsPage.emissionSources")}</h3>
              <p className="text-xs text-muted-foreground mt-1">{t("insightsPage.emissionSourcesDesc")}</p>
            </div>
            <div className="h-[200px]">
              {categoryData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={categoryData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={2} dataKey="value" stroke="none">
                      {categoryData.map((_, index) => (
                        <Cell key={index} fill={pieColors[index % pieColors.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip formatter={(v: number) => [`${v.toFixed(1)} kg CO₂`, t("dashboard.carbonBreakdown")]} contentStyle={{ borderRadius: "12px", border: "1px solid var(--color-border)", fontSize: 11 }} />
                    <Legend verticalAlign="bottom" height={24} iconType="circle" wrapperStyle={{ fontSize: "10px", color: "var(--color-foreground)" }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground text-sm flex-col gap-2">
                  <Info className="h-5 w-5 opacity-50" /> {t("insightsPage.noData")}
                </div>
              )}
            </div>
          </div>
        </motion.div>

        <motion.div variants={item}>
          <div className="saas-card h-full">
            <div className="mb-3">
              <h3 className="text-base font-semibold leading-none tracking-tight text-foreground">{t("insightsPage.dailyAverages")}</h3>
              <p className="text-xs text-muted-foreground mt-1">{t("insightsPage.dailyAveragesDesc")}</p>
            </div>
            <div className="h-[200px] pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={[
                    { name: t("insightsPage.yourAvg"), value: summary?.dailyAverage || 0 },
                    { name: t("insightsPage.globalAvg"), value: summary?.globalAverage || 0 },
                  ]}
                  layout="vertical"
                  margin={{ top: 0, right: 20, left: 10, bottom: 0 }}
                  barSize={30}
                >
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: "var(--color-foreground)", fontWeight: 500, fontSize: 10 }} />
                  <RechartsTooltip cursor={{ fill: "transparent" }} formatter={(v: number) => [`${v.toFixed(1)} kg`, t("insightsPage.dailyCO2")]} contentStyle={{ borderRadius: "12px", border: "1px solid var(--color-border)", fontSize: 11 }} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {[0, 1].map((_, index) => (
                      <Cell key={index} fill={index === 0 ? "#10b981" : "#4b5563"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
