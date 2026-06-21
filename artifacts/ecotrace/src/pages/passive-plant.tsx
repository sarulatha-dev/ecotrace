import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSessionId } from "@/hooks/use-session";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  TreePine, Smartphone, MapPin, Gift, Trophy,
  Plus, Bell, Leaf, Coins, Cloud, LineChart, ChevronRight, TrendingUp, TrendingDown
} from "lucide-react";
import {
  ResponsiveContainer, ComposedChart, Bar, Line,
  XAxis, YAxis, CartesianGrid, Tooltip,
} from "recharts";

// ─── API helpers ──────────────────────────────────────────────────────────────
async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, { headers: { "Content-Type": "application/json" }, ...options });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<T>;
}

interface Summary {
  total_screen_hours: number;
  total_co2_kg: number;
  total_trees_planted: number;
  total_co2_offset: number;
  coins_earned: number;
}
interface Tree {
  id: number;
  sessionId: string;
  plantDate: string;
  treesPlanted: number;
  co2OffsetKg: number;
  location: string;
  projectName: string;
  isVerified: boolean;
}
interface MapLoc {
  location: string;
  totalTrees: number;
  totalCo2: number;
}
interface Reward {
  id: number;
  rewardType: string;
  rewardValue: number;
  rewardDate: string;
  isClaimed: boolean;
}
interface TrackResult {
  success: boolean;
  co2_kg: number;
  trees_earned: number;
  trees_planted: number;
  location: string | null;
}
interface HistoryDay {
  date: string;
  label: string;
  screenHours: number;
  co2Kg: number;
  treesPlanted: number;
}

const ECO = "#10b981";
const ECO_DARK = "rgba(4,14,10,0.88)";
const CARD_BORDER = "rgba(16,185,129,0.22)";
const CARD_BG = "rgba(6,20,14,0.82)";

// ─── Dark Stat card ──────────────────────────────────────────────────────────
function StatCard({
  icon: Icon, label, value, trend, trendUp = true, color, iconBg, delay = 0
}: {
  icon: any; label: string; value: string; trend: string; trendUp?: boolean; color: string; iconBg: string; delay?: number
}) {
  return (
    <motion.div
      className="rounded-xl p-4 flex flex-col justify-between relative overflow-hidden"
      style={{
        background: CARD_BG,
        border: `1px solid ${CARD_BORDER}`,
        backdropFilter: "blur(16px)",
        boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
      }}
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay, ease: "easeOut" }}
    >
      {/* Subtle green glow top-right */}
      <div className="absolute top-0 right-0 w-16 h-16 rounded-bl-full opacity-20"
        style={{ background: `radial-gradient(circle, ${color.replace("text-", "")} 0%, transparent 70%)` }} />
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center", iconBg)}>
            <Icon className={cn("h-4.5 w-4.5", color)} />
          </div>
          <div className={cn("flex items-center gap-0.5 text-[9px] font-bold", trendUp ? "text-emerald-400" : "text-red-400")}>
            {trendUp ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
          </div>
        </div>
        <div className="text-2xl font-extrabold text-white leading-tight">{value}</div>
        <div className="text-[10px] font-semibold text-white/40 mt-0.5">{label}</div>
      </div>
      <div className={cn("text-[9px] font-bold mt-3 pt-2 flex items-center gap-1", trendUp ? "text-emerald-400" : "text-red-400")}
        style={{ borderTop: "1px solid rgba(16,185,129,0.15)" }}>
        {trend}
      </div>
    </motion.div>
  );
}

// ─── Dark glass card wrapper ──────────────────────────────────────────────────
function GlassCard({ title, icon: Icon, iconColor = ECO, children, delay = 0, className = "" }: {
  title: string; icon: any; iconColor?: string;
  children: React.ReactNode; delay?: number; className?: string;
}) {
  return (
    <motion.div
      className={cn("rounded-xl p-4 flex flex-col", className)}
      style={{
        background: CARD_BG,
        border: `1px solid ${CARD_BORDER}`,
        backdropFilter: "blur(16px)",
        boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
      }}
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay, ease: "easeOut" }}
    >
      <div className="flex items-center gap-2 mb-3">
        <Icon className="w-4 h-4 shrink-0" style={{ color: iconColor }} />
        <h2 className="font-bold text-white text-xs tracking-wide uppercase">{title}</h2>
      </div>
      {children}
    </motion.div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function PassivePlant() {
  const { t } = useTranslation();
  const sessionId = useSessionId();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [screenH, setScreenH] = useState("");
  const [appH, setAppH] = useState("");
  const [showLogModal, setShowLogModal] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "history" | "rewards">("overview");


  const summaryQ = useQuery({
    queryKey: ["passive-summary", sessionId],
    queryFn: () => apiFetch<Summary>(`/api/passive/summary?sessionId=${sessionId}`),
    enabled: !!sessionId,
  });
  const treesQ = useQuery({
    queryKey: ["pp-trees", sessionId],
    queryFn: () => apiFetch<Tree[]>(`/api/trees?sessionId=${sessionId}`),
    enabled: !!sessionId,
  });
  const mapQ = useQuery({
    queryKey: ["pp-tree-map"],
    queryFn: () => apiFetch<MapLoc[]>("/api/trees/map"),
  });
  const rewardsQ = useQuery({
    queryKey: ["pp-rewards", sessionId],
    queryFn: () => apiFetch<Reward[]>(`/api/passive/rewards?sessionId=${sessionId}`),
    enabled: !!sessionId,
  });
  const historyQ = useQuery({
    queryKey: ["pp-history", sessionId],
    queryFn: () => apiFetch<HistoryDay[]>(`/api/phone/history?sessionId=${sessionId}`),
    enabled: !!sessionId,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["passive-summary", sessionId] });
    qc.invalidateQueries({ queryKey: ["pp-trees", sessionId] });
    qc.invalidateQueries({ queryKey: ["pp-rewards", sessionId] });
    qc.invalidateQueries({ queryKey: ["pp-tree-map"] });
    qc.invalidateQueries({ queryKey: ["pp-history", sessionId] });
  };

  const trackMut = useMutation({
    mutationFn: (data: { screen_time_hours: number; app_usage_hours: number }) =>
      apiFetch<TrackResult>("/api/phone/track", {
        method: "POST",
        body: JSON.stringify({ sessionId, battery_drain_mah: 0, ...data }),
      }),
    onSuccess: (data) => {
      const msg = data.trees_planted >= 1
        ? `🌳 ${data.trees_planted} tree${data.trees_planted > 1 ? "s" : ""} planted in ${data.location}!`
        : `CO₂ logged (${data.co2_kg.toFixed(3)} kg). Keep going!`;
      toast({ title: t("logActivity.success"), description: msg });
      setScreenH(""); setAppH("");
      invalidate();
    },
    onError: () => toast({ title: t("logActivity.error"), variant: "destructive" }),
  });

  const claimMut = useMutation({
    mutationFn: (id: number) =>
      apiFetch("/api/rewards/claim", { method: "POST", body: JSON.stringify({ sessionId, reward_id: id }) }),
    onSuccess: () => { toast({ title: "Reward claimed! 🎉" }); invalidate(); },
    onError: () => toast({ title: t("logActivity.error"), variant: "destructive" }),
  });

  const summary = summaryQ.data;
  const trees = treesQ.data ?? [];
  const treeMap = mapQ.data ?? [];
  const rewards = rewardsQ.data ?? [];
  const history = historyQ.data ?? [];
  const unclaimed = rewards.filter(r => !r.isClaimed);
  const hasHistory = history.some(d => d.screenHours > 0 || d.treesPlanted > 0);

  const totalPlanted = summary?.total_trees_planted ?? 0;

  const stats = [
    { icon: TreePine, label: t("passivePlant.treesPlanted"), value: `${totalPlanted}`, trend: `+3 this week 🌱`, trendUp: true, color: "text-emerald-400", iconBg: "bg-emerald-500/10", delay: 0 },
    { icon: Smartphone, label: t("passivePlant.screenTime"), value: `${(summary?.total_screen_hours ?? 0).toFixed(1)}h`, trend: `↓ 18% vs last week`, trendUp: false, color: "text-blue-400", iconBg: "bg-blue-500/10", delay: 0.06 },
    { icon: Cloud, label: t("passivePlant.co2Offset"), value: `${(summary?.total_co2_offset ?? 0).toFixed(1)} kg`, trend: `↑ 12% vs last week`, trendUp: true, color: "text-teal-400", iconBg: "bg-teal-500/10", delay: 0.12 },
    { icon: Coins, label: t("passivePlant.coinsEarned"), value: `${summary?.coins_earned ?? 0}`, trend: `+40 today 🪙`, trendUp: true, color: "text-amber-400", iconBg: "bg-amber-500/10", delay: 0.18 },
  ];

  // India geographic mapping
  const hasMaharashtra = trees.some(t => t.location?.toLowerCase().includes("maharashtra"));
  const hasKarnataka = trees.some(t => t.location?.toLowerCase().includes("karnataka"));
  const hasUP = trees.some(t => t.location?.toLowerCase().includes("uttar pradesh"));

  const locationsToRender = [
    { name: "Maharashtra", cx: 80, cy: 125, active: hasMaharashtra || trees.length === 0 },
    { name: "Karnataka", cx: 85, cy: 160, active: hasKarnataka || trees.length === 0 },
    { name: "Uttar Pradesh", cx: 105, cy: 70, active: hasUP || trees.length === 0 }
  ];

  const forestLevel = totalPlanted < 10 ? 1 : totalPlanted < 25 ? 2 : totalPlanted < 50 ? 3 : 4;
  const progressPct = Math.min(100, Math.round((totalPlanted / 50) * 100));
  const radius = 22;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progressPct / 100) * circumference;

  const milestones = [
    { count: 5, key: "seed", label: "Seed Planted", icon: "🌱" },
    { count: 10, key: "sprout", label: "Sprout", icon: "🌿" },
    { count: 25, key: "young", label: "Young Tree", icon: "🌳" },
    { count: 50, key: "forest", label: "Forest", icon: "🌲" }
  ];

  return (
    <div className="relative space-y-4 min-h-[calc(100vh-6rem)]" style={{ color: "white" }}>
      <style>{`
        .pp-dark-page { --card-bg: rgba(6,20,14,0.82); }
        .pp-dark-chart .recharts-cartesian-grid-horizontal line { stroke: rgba(16,185,129,0.1); }
        .pp-dark-chart .recharts-text { fill: rgba(255,255,255,0.4) !important; }
      `}</style>

      <div className="relative z-10 space-y-4">
        {/* ── Header ── */}
        <div className="flex items-center justify-between flex-wrap gap-4 pb-3 mb-2"
          style={{ borderBottom: "1px solid rgba(16,185,129,0.2)" }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: "rgba(16,185,129,0.18)", border: "1px solid rgba(16,185,129,0.35)" }}>
              <span className="text-xl">🌱</span>
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight text-white leading-none">{t("passivePlant.title")}</h1>
              <p className="text-[11px] text-white/40 mt-1 leading-none">{t("passivePlant.desc")}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <motion.button
              onClick={() => setShowLogModal(true)}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              className="flex items-center gap-1.5 h-8 px-4 text-xs font-bold text-white rounded-lg cursor-pointer"
              style={{ background: ECO, boxShadow: "0 0 18px rgba(16,185,129,0.4)" }}
            >
              <Plus className="h-3.5 w-3.5" />
              {t("passivePlant.logUsage")}
            </motion.button>
            <button className="relative w-8 h-8 rounded-full flex items-center justify-center"
              style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)" }}>
              <Bell className="h-4 w-4 text-white/50" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-500 border border-black/30" />
            </button>
          </div>
        </div>

        {/* ── Sub Navigation Tabs ── */}
        <div className="flex gap-3" style={{ borderBottom: "1px solid rgba(16,185,129,0.15)" }}>
        {[
          { id: "overview" as const, label: t("passivePlant.tabs.overview") },
          { id: "history" as const, label: t("passivePlant.tabs.history") },
          { id: "rewards" as const, label: t("passivePlant.tabs.rewards") },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "pb-2 text-xs font-bold transition-all px-1.5 border-b-2 -mb-px leading-none cursor-pointer duration-300",
              activeTab === tab.id
                ? "border-emerald-500 text-emerald-400"
                : "border-transparent text-white/30 hover:text-white/60"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === "overview" && (
          <motion.div
            key="overview"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="space-y-4"
          >
            {/* ── Stats Grid ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {stats.map((s, idx) => (
                <StatCard key={idx} {...s} />
              ))}
            </div>

            {/* ── Your Forest Card ── */}
            <motion.div
              className="relative rounded-xl overflow-hidden h-60 bg-cover bg-center flex flex-col justify-between p-4"
              style={{ backgroundImage: "url('https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80')" }}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              {/* Gradient overlay */}
              <div className="absolute inset-0 z-0"
                style={{ background: "linear-gradient(to bottom, rgba(2,10,6,0.6) 0%, rgba(2,10,6,0.3) 40%, rgba(2,10,6,0.75) 100%)" }} />
              {/* Green glow at bottom */}
              <div className="absolute bottom-0 left-0 right-0 h-24 z-0"
                style={{ background: "linear-gradient(to top, rgba(16,185,129,0.25), transparent)" }} />

              {/* Card Header */}
              <div className="flex items-center justify-between z-10 w-full">
                <div className="flex items-center gap-1.5 text-white">
                  <Leaf className="h-4 w-4 text-emerald-400" />
                  <span className="font-bold text-sm tracking-tight">Your Forest</span>
                </div>
                <Badge className="text-white font-bold text-[10px] border-0 px-2 py-0.5 shadow-sm"
                  style={{ background: "rgba(16,185,129,0.8)", backdropFilter: "blur(8px)" }}>
                  {t("passivePlant.forestLevel", { level: forestLevel })}
                </Badge>
              </div>

              {/* Progress & Timeline */}
              <div className="flex items-end justify-between gap-4 z-10 w-full">
                {/* Circular Progress */}
                <div className="flex items-center gap-2.5">
                  <div className="relative w-12 h-12 shrink-0 flex items-center justify-center rounded-full"
                    style={{ background: "rgba(0,0,0,0.35)", border: "1px solid rgba(16,185,129,0.2)" }}>
                    <svg className="w-full h-full transform -rotate-90">
                      <circle cx="24" cy="24" r={radius} stroke="rgba(255,255,255,0.1)" strokeWidth="3" fill="transparent" />
                      <circle
                        cx="24" cy="24" r={radius} stroke="#10b981" strokeWidth="3" fill="transparent"
                        strokeDasharray={circumference}
                        strokeDashoffset={strokeDashoffset}
                        strokeLinecap="round"
                        className="transition-all duration-1000"
                      />
                    </svg>
                    <span className="absolute text-[10px] font-black text-white">{progressPct}%</span>
                  </div>
                  <div className="leading-none">
                    <p className="text-[9px] font-bold text-white/50 uppercase tracking-widest">{t("passivePlant.forestGrowth")}</p>
                    <p className="text-[11px] font-semibold text-white mt-1">Real trees, real impact</p>
                  </div>
                </div>

                {/* Milestone Timeline */}
                <div className="hidden md:flex items-center gap-6 flex-1 max-w-[420px] justify-between relative pl-8 pb-1">
                  {/* Horizontal bar */}
                  <div className="absolute top-[18px] left-[45px] right-[45px] h-0.5 z-0"
                    style={{ background: "rgba(255,255,255,0.12)" }}>
                    <div
                      className="h-full transition-all duration-1000"
                      style={{
                        background: "linear-gradient(90deg, #10b981, #34d399)",
                        width: `${
                          totalPlanted < 5 ? 0 :
                          totalPlanted < 10 ? 15 :
                          totalPlanted < 25 ? 50 :
                          totalPlanted < 50 ? 82 : 100
                        }%`
                      }}
                    />
                  </div>
                  {milestones.map((m, i) => {
                    const done = totalPlanted >= m.count;
                    const isLast = i === milestones.length - 1;
                    return (
                      <div key={m.key} className="flex flex-col items-center text-center relative z-10 flex-1">
                        <span className="text-base leading-none mb-1 filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]"
                          style={{ animation: done ? "pulse 2s infinite" : undefined }}>
                          {isLast && !done ? "🔒" : m.icon}
                        </span>
                        <div
                          className={cn(
                            "w-2.5 h-2.5 rounded-full border-2 transition-all duration-500",
                            done
                              ? "bg-emerald-400 border-white scale-110 shadow-[0_0_8px_#34d399]"
                              : "bg-black/30 border-white/20"
                          )}
                        />
                        <span className="text-[9px] font-bold text-white mt-1.5 leading-none">{m.label}</span>
                        <span className="text-[8px] text-white/40 mt-0.5 leading-none">{m.count} Trees</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.div>

            {/* ── Bottom Grid ── */}
            <div className="grid gap-3 md:grid-cols-2">
              {/* Recent Activity + Map */}
              <GlassCard title={t("passivePlant.recentActivity")} icon={Leaf} iconColor={ECO} delay={0.2}>
                <div className="flex flex-col sm:flex-row gap-4 items-center">
                  {/* Activity List */}
                  <div className="flex-1 w-full space-y-2">
                    {trees.length === 0 ? (
                      [
                        { name: "Mango Tree", loc: "Maharashtra", badge: "Just now" },
                        { name: "Neem Tree", loc: "Karnataka", badge: "2h ago" },
                        { name: "Peepal Tree", loc: "Uttar Pradesh", badge: "1d ago" }
                      ].map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2.5 rounded-lg"
                          style={{ background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.12)" }}>
                          <div className="flex items-center gap-2.5">
                            <div className="text-lg">🌳</div>
                            <div>
                              <p className="text-xs font-bold text-white leading-none">{item.name}</p>
                              <p className="text-[10px] text-white/40 mt-1">📍 Planted in {item.loc}</p>
                            </div>
                          </div>
                          <span className="text-[8px] font-bold px-2 py-0.5 rounded-full"
                            style={{ background: "rgba(16,185,129,0.15)", color: "#34d399", border: "1px solid rgba(16,185,129,0.2)" }}>
                            {item.badge}
                          </span>
                        </div>
                      ))
                    ) : (
                      trees.slice(0, 3).map((t, idx) => (
                        <div key={t.id} className="flex items-center justify-between p-2.5 rounded-lg"
                          style={{ background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.12)" }}>
                          <div className="flex items-center gap-2.5">
                            <div className="text-lg">🌳</div>
                            <div>
                              <p className="text-xs font-bold text-white leading-none">{t.projectName}</p>
                              <p className="text-[10px] text-white/40 mt-1">📍 Planted in {t.location}</p>
                            </div>
                          </div>
                          <span className="text-[8px] font-bold px-2 py-0.5 rounded-full"
                            style={{ background: "rgba(16,185,129,0.15)", color: "#34d399", border: "1px solid rgba(16,185,129,0.2)" }}>
                            {idx === 0 ? "Just now" : idx === 1 ? "2h ago" : `${idx}d ago`}
                          </span>
                        </div>
                      ))
                    )}
                  </div>

                  {/* India Geographic Map */}
                  <div className="flex-shrink-0 w-full sm:w-44 flex justify-center items-center rounded-xl p-2 overflow-hidden relative"
                    style={{ background: "rgba(16,185,129,0.04)", border: "1px solid rgba(16,185,129,0.12)" }}>
                    <svg viewBox="0 0 200 220" className="w-full h-44 z-10"
                      style={{ filter: "drop-shadow(0 0 12px rgba(16,185,129,0.2))" }}>
                      <path
                        d="M 100,15 
                           C 105,10 115,20 112,30 
                           C 110,35 125,45 125,55 
                           C 125,60 135,65 140,60 
                           C 145,55 155,55 160,65 
                           C 165,70 185,70 190,80 
                           C 192,85 180,95 175,92 
                           C 170,90 162,102 155,100 
                           C 152,98 148,110 142,108 
                           C 138,105 138,118 132,122 
                           C 125,126 122,145 115,160 
                           C 110,170 105,185 100,200 
                           C 97,185 90,170 85,160 
                           C 75,140 70,120 70,110
                           C 70,105 55,105 50,100
                           C 45,95 35,95 32,90
                           C 30,85 45,80 48,70
                           C 50,60 62,55 68,50
                           C 72,45 85,45 90,35
                           C 92,30 95,20 100,15 Z"
                        fill="rgba(16, 185, 129, 0.08)"
                        stroke="rgba(16, 185, 129, 0.35)"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      {locationsToRender.map((p, i) => (
                        <g key={i}>
                          {p.active && (
                            <motion.circle
                              cx={p.cx} cy={p.cy} r={8} fill="#10b981" opacity={0.2}
                              animate={{ scale: [1, 1.8, 1], opacity: [0.2, 0, 0.2] }}
                              transition={{ duration: 2, repeat: Infinity, delay: i * 0.4 }}
                            />
                          )}
                          <circle cx={p.cx} cy={p.cy} r={4} fill={p.active ? "#10b981" : "rgba(255,255,255,0.15)"} stroke="rgba(255,255,255,0.3)" strokeWidth="1" />
                        </g>
                      ))}
                    </svg>
                  </div>
                </div>
              </GlassCard>

              {/* Live Impact Card */}
              <GlassCard title={t("passivePlant.liveImpact")} icon={LineChart} iconColor={ECO} delay={0.25}>
                <p className="text-[10px] text-white/35 mb-3.5 leading-none">{t("passivePlant.differenceText")}</p>

                <div className="flex flex-col sm:flex-row gap-4 items-stretch">
                  {/* Metric items */}
                  <div className="flex-1 flex flex-col justify-center gap-3">
                    {[
                      { label: t("passivePlant.co2Offset"), value: `${(summary?.total_co2_offset ?? 0).toFixed(1)} kg`, icon: Cloud, color: "text-teal-400", bg: "bg-teal-500/10" },
                      { label: t("passivePlant.treesPlanted"), value: `${totalPlanted}`, icon: TreePine, color: "text-emerald-400", bg: "bg-emerald-500/10" },
                      { label: t("passivePlant.screenTime"), value: `${(summary?.total_screen_hours ?? 0).toFixed(1)}h`, icon: Smartphone, color: "text-blue-400", bg: "bg-blue-500/10" }
                    ].map((item, idx) => {
                      const ItemIcon = item.icon;
                      return (
                        <div key={idx} className="flex items-center gap-3">
                          <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", item.bg)}
                            style={{ border: "1px solid rgba(16,185,129,0.15)" }}>
                            <ItemIcon className={cn("h-4 w-4", item.color)} />
                          </div>
                          <div className="leading-none">
                            <p className="text-xs font-extrabold text-white">{item.value}</p>
                            <p className="text-[9px] text-white/40 font-bold mt-1">{item.label}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Dark Green Callout Panel */}
                  <div className="flex-1 rounded-xl p-3 flex flex-col items-center justify-center text-center"
                    style={{
                      background: "linear-gradient(135deg, rgba(16,185,129,0.25) 0%, rgba(5,150,105,0.15) 100%)",
                      border: "1px solid rgba(16,185,129,0.3)",
                    }}>
                    <div className="relative w-14 h-14 flex items-center justify-center mb-2">
                      <svg className="absolute inset-0 w-full h-full transform -rotate-90">
                        <circle cx="28" cy="28" r="22" stroke="rgba(255,255,255,0.08)" strokeWidth="3" fill="transparent" />
                        <circle cx="28" cy="28" r="22" stroke="#4ade80" strokeWidth="3" fill="transparent" strokeDasharray="138" strokeDashoffset="35" strokeLinecap="round" />
                      </svg>
                      <span className="text-xl filter drop-shadow-[0_0_8px_rgba(74,222,128,0.8)]"
                        style={{ animation: "bounce 3s infinite" }}>🌳</span>
                    </div>
                    <p className="text-xs font-bold text-white leading-none">{t("passivePlant.keepGoing")}</p>
                    <p className="text-[10px] text-emerald-300 mt-1 leading-relaxed px-1 font-medium">
                      {t("passivePlant.planetText")}
                    </p>
                  </div>
                </div>
              </GlassCard>
            </div>
          </motion.div>
        )}

        {activeTab === "history" && (
          <motion.div
            key="history"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="space-y-4"
          >
            {/* ── 7-Day History Chart ── */}
            <div className="rounded-xl p-4 pp-dark-chart"
              style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}`, backdropFilter: "blur(16px)" }}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-base">📊</span>
                  <h2 className="font-bold text-white text-xs tracking-wide uppercase">{t("insightsPage.trends")}</h2>
                </div>
                <div className="flex items-center gap-4 text-[10px] text-white/40">
                  <span className="flex items-center gap-1">
                    <span className="inline-block w-2.5 h-2.5 rounded-sm bg-blue-400/70" />{t("passivePlant.screenTime")}
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="inline-block w-2.5 h-2 rounded-full bg-emerald-500" />{t("passivePlant.treesPlanted")}
                  </span>
                </div>
              </div>

              {!hasHistory ? (
                <div className="flex flex-col items-center justify-center h-28 text-center">
                  <div className="text-2xl mb-1">📱</div>
                  <div className="text-xs text-white/30 font-medium">{t("passivePlant.noTrees")}</div>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={160}>
                  <ComposedChart data={history} margin={{ top: 4, right: 16, left: -12, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke="rgba(16,185,129,0.1)" />
                    <XAxis dataKey="label" tick={{ fontSize: 9, fill: "rgba(255,255,255,0.35)" }} axisLine={false} tickLine={false} />
                    <YAxis yAxisId="hours" orientation="left" tick={{ fontSize: 9, fill: "rgba(255,255,255,0.35)" }} axisLine={false} tickLine={false} tickFormatter={v => `${v}h`} />
                    <YAxis yAxisId="trees" orientation="right" tick={{ fontSize: 9, fill: "#059669" }} axisLine={false} tickLine={false} tickFormatter={v => `${v}🌳`} width={30} />
                    <Tooltip
                      contentStyle={{ background: "rgba(6,20,14,0.95)", border: "1px solid rgba(16,185,129,0.3)", borderRadius: 8, fontSize: 10, boxShadow: "0 4px 12px rgba(0,0,0,0.4)", color: "white" }}
                      formatter={(value: number, name: string) => name === "screenHours" ? [`${value}h`, t("passivePlant.screenTime")] : [`${value}`, t("passivePlant.treesEarned")]}
                      labelStyle={{ color: "rgba(255,255,255,0.6)", fontWeight: 600, marginBottom: 2 }}
                    />
                    <Bar yAxisId="hours" dataKey="screenHours" fill="rgba(96,165,250,0.6)" radius={[4, 4, 0, 0]} maxBarSize={30} />
                    <Line yAxisId="trees" dataKey="treesPlanted" type="monotone" stroke="#059669" strokeWidth={2} dot={{ fill: "#059669", r: 2.5, strokeWidth: 0 }} activeDot={{ r: 4, fill: "#059669" }} />
                  </ComposedChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* ── Forest Map List ── */}
            <GlassCard title={t("passivePlant.history")} icon={MapPin} iconColor="#ef4444">
              {treeMap.length === 0 ? (
                <div className="text-center py-6">
                  <div className="text-3xl mb-1">🗺️</div>
                  <div className="text-[10px] text-white/30">Plant trees to see your forest map</div>
                </div>
              ) : (
                <div className="space-y-3">
                  {treeMap.map((loc, i) => {
                    const maxT = Math.max(...treeMap.map(l => l.totalTrees), 1);
                    return (
                      <div key={loc.location}>
                        <div className="flex justify-between items-baseline mb-1">
                          <span className="text-[10px] font-medium text-white/70 flex items-center gap-0.5">
                            <span>📍</span>{loc.location}
                          </span>
                          <span className="text-[10px] font-bold text-emerald-400">{loc.totalTrees} trees</span>
                        </div>
                        <div className="h-1.5 rounded-full overflow-hidden"
                          style={{ background: "rgba(255,255,255,0.08)" }}>
                          <motion.div
                            className="h-full rounded-full"
                            style={{ background: "linear-gradient(90deg, #059669, #10b981)" }}
                            initial={{ width: 0 }}
                            animate={{ width: `${(loc.totalTrees / maxT) * 100}%` }}
                            transition={{ duration: 0.9, delay: i * 0.08, ease: "easeOut" }}
                          />
                        </div>
                        <div className="text-[8px] text-white/30 mt-0.5">{loc.totalCo2.toFixed(2)} kg CO₂ offset</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </GlassCard>
          </motion.div>
        )}

        {activeTab === "rewards" && (
          <motion.div
            key="rewards"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="space-y-4"
          >
            {/* ── Claim Rewards ── */}
            <GlassCard title={t("nav.rewards")} icon={Gift} iconColor="#a855f7">
              {unclaimed.length > 0 && (
                <div className="mb-2.5 flex items-center gap-2 text-[10px] font-semibold rounded-lg px-2.5 py-1"
                  style={{ color: "#d8b4fe", background: "rgba(168,85,247,0.1)", border: "1px solid rgba(168,85,247,0.2)" }}>
                  <Gift className="w-3 h-3" />
                  {unclaimed.length} reward{unclaimed.length > 1 ? "s" : ""} ready
                </div>
              )}
              {rewards.length === 0 ? (
                <div className="text-center py-6">
                  <div className="text-3xl mb-1">🎁</div>
                  <div className="text-[10px] text-white/30">Plant 5+ trees to unlock rewards</div>
                </div>
              ) : (
                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                  {rewards.map(r => (
                    <div
                      key={r.id}
                      className="flex items-center justify-between p-2 rounded-lg border text-xs"
                      style={{
                        background: r.isClaimed ? "rgba(255,255,255,0.03)" : "rgba(168,85,247,0.08)",
                        border: r.isClaimed ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(168,85,247,0.2)"
                      }}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-base shrink-0">
                          {r.rewardType === "tree" ? "🌳" : r.rewardType === "coin" ? "🪙" : "🎫"}
                        </span>
                        <div className="truncate">
                          <div className="font-semibold text-white/80 capitalize truncate">{r.rewardType}</div>
                          <div className="text-[8px] text-white/40 mt-0.5">
                            {r.rewardValue} {r.rewardType === "coin" ? "coins" : r.rewardType === "tree" ? "trees" : "₹ off"}
                          </div>
                        </div>
                      </div>
                      {r.isClaimed ? (
                        <span className="text-[8px] text-white/30">Claimed</span>
                      ) : (
                        <motion.button
                          onClick={() => claimMut.mutate(r.id)}
                          disabled={claimMut.isPending}
                          className="text-[9px] font-bold px-2 py-0.5 rounded cursor-pointer text-white"
                          style={{ background: "#9333ea" }}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          {t("rewardsPage.redeem")}
                        </motion.button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </GlassCard>

            {/* ── Community Impact ── */}
            <motion.div
              className="rounded-xl p-4 flex items-center gap-3"
              style={{
                background: "linear-gradient(135deg, rgba(16,185,129,0.15) 0%, rgba(5,150,105,0.08) 100%)",
                border: "1px solid rgba(16,185,129,0.25)",
                backdropFilter: "blur(16px)",
              }}
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            >
              <Trophy className="w-6 h-6 text-emerald-400 shrink-0 animate-bounce" style={{ animationDuration: "4s" }} />
              <div>
                <div className="text-xs font-bold text-white">Community Impact</div>
                <div className="text-[10px] text-white/40 mt-0.5">
                  {treeMap.reduce((s, l) => s + l.totalTrees, 0)} trees planted across {treeMap.length} forest{treeMap.length !== 1 ? "s" : ""} by all EcoSphere users
                </div>
              </div>
              <div className="ml-auto text-2xl">🌍</div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Custom Dark Glassmorphic Popup Modal ── */}
      <AnimatePresence>
        {showLogModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            {/* Backdrop */}
            <motion.div
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowLogModal(false)}
            />

            {/* Modal Box */}
            <motion.div
              className="w-full max-w-sm rounded-xl p-5 z-10 relative overflow-hidden"
              style={{
                background: "rgba(4,14,10,0.96)",
                border: "1px solid rgba(16,185,129,0.3)",
                backdropFilter: "blur(24px)",
                boxShadow: "0 0 48px rgba(16,185,129,0.15), 0 24px 48px rgba(0,0,0,0.6)",
              }}
              initial={{ scale: 0.93, opacity: 0, y: 14 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.93, opacity: 0, y: 14 }}
              transition={{ type: "spring", stiffness: 350, damping: 28 }}
            >
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ background: "rgba(16,185,129,0.18)", border: "1px solid rgba(16,185,129,0.35)" }}>
                  <Smartphone className="h-4 w-4 text-emerald-400" />
                </div>
                <h3 className="font-bold text-sm text-white">{t("passivePlant.logSuccessMsg")}</h3>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] font-bold text-white/40 mb-1.5 block uppercase tracking-wider">{t("passivePlant.screenTimeHours")}</label>
                  <input
                    type="number" min="0" step="0.5" placeholder="e.g. 3.5"
                    value={screenH} onChange={e => setScreenH(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl text-white placeholder-white/25 focus:outline-none transition-colors"
                    style={{
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(16,185,129,0.2)",
                    }}
                    onFocus={e => (e.target.style.borderColor = "rgba(16,185,129,0.5)")}
                    onBlur={e => (e.target.style.borderColor = "rgba(16,185,129,0.2)")}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-white/40 mb-1.5 block uppercase tracking-wider">{t("passivePlant.appUsageHours")}</label>
                  <input
                    type="number" min="0" step="0.5" placeholder="e.g. 2.0"
                    value={appH} onChange={e => setAppH(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl text-white placeholder-white/25 focus:outline-none transition-colors"
                    style={{
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(16,185,129,0.2)",
                    }}
                    onFocus={e => (e.target.style.borderColor = "rgba(16,185,129,0.5)")}
                    onBlur={e => (e.target.style.borderColor = "rgba(16,185,129,0.2)")}
                  />
                </div>

                <div className="p-2.5 rounded-lg text-[10px] leading-relaxed space-y-0.5"
                  style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.15)" }}>
                  <div className="text-emerald-400">📱 Screen time → CO₂ footprint (0.01 kg/hr)</div>
                  <div className="text-emerald-400">🌱 1 tree planted for every 2 hours of use</div>
                  <div className="text-emerald-400">🪙 Each tree = 10 coins in your Eco Wallet</div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    className="flex-1 h-9 text-xs font-semibold rounded-lg text-white/60 cursor-pointer"
                    style={{ border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.04)" }}
                    onClick={() => setShowLogModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      if (!screenH) return;
                      trackMut.mutate({ screen_time_hours: +screenH, app_usage_hours: +(appH || 0) });
                      setShowLogModal(false);
                    }}
                    disabled={!screenH || trackMut.isPending}
                    className="flex-1 h-9 text-xs font-bold text-white rounded-lg cursor-pointer transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ background: ECO, boxShadow: "0 0 18px rgba(16,185,129,0.3)" }}
                  >
                    {trackMut.isPending ? "..." : t("passivePlant.logSuccessMsg")}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      </div>
    </div>
  );
}
