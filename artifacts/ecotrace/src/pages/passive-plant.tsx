import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSessionId } from "@/hooks/use-session";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { TreePine, Smartphone, MapPin, Gift, Trophy } from "lucide-react";
import {
  ResponsiveContainer, ComposedChart, Bar, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from "recharts";

// ─── API helpers ──────────────────────────────────────────────────────────────
async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, { headers: { "Content-Type": "application/json" }, ...options });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<T>;
}

interface Summary {
  total_screen_hours: number; total_co2_kg: number;
  total_trees_planted: number; total_co2_offset: number; coins_earned: number;
}
interface Tree { id: number; sessionId: string; plantDate: string; treesPlanted: number; co2OffsetKg: number; location: string; projectName: string; isVerified: boolean; }
interface MapLoc { location: string; totalTrees: number; totalCo2: number; }
interface Reward { id: number; rewardType: string; rewardValue: number; rewardDate: string; isClaimed: boolean; }
interface TrackResult { success: boolean; co2_kg: number; trees_earned: number; trees_planted: number; location: string | null; }
interface HistoryDay  { date: string; label: string; screenHours: number; co2Kg: number; treesPlanted: number; }

// ─── Stat card ────────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, color, delay = 0 }: { icon: string; label: string; value: string; color: string; delay?: number }) {
  return (
    <motion.div
      className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm"
      initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay, ease: "easeOut" }}
      whileHover={{ scale: 1.04, y: -4, boxShadow: "0 12px 28px rgba(0,0,0,0.09)", transition: { duration: 0.16 } }}
      whileTap={{ scale: 0.97 }}
    >
      <div className="text-2xl mb-2">{icon}</div>
      <div className="text-2xl font-black" style={{ color }}>{value}</div>
      <div className="text-xs text-gray-400 mt-0.5">{label}</div>
    </motion.div>
  );
}

// ─── Section wrapper ──────────────────────────────────────────────────────────
function Section({ title, icon: Icon, iconColor, children, delay = 0 }: {
  title: string; icon: React.ElementType; iconColor: string;
  children: React.ReactNode; delay?: number;
}) {
  return (
    <motion.div
      className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm"
      initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay, ease: "easeOut" }}
    >
      <div className="flex items-center gap-2 mb-5">
        <Icon className="w-5 h-5 shrink-0" style={{ color: iconColor }} />
        <h2 className="font-bold text-gray-800 text-sm">{title}</h2>
      </div>
      {children}
    </motion.div>
  );
}

// ─── Tree grid ────────────────────────────────────────────────────────────────
function TreeGrid({ count }: { count: number }) {
  const filled = Math.min(count, 40);
  return (
    <div className="flex flex-wrap gap-1.5 py-2">
      {Array.from({ length: Math.max(filled, 8) }).map((_, i) => (
        <motion.span
          key={i}
          className="text-xl"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: i < filled ? 1 : 0.12 }}
          transition={{ delay: i * 0.03, type: "spring", stiffness: 200 }}
        >
          🌳
        </motion.span>
      ))}
      {count > 40 && <span className="text-sm text-gray-400 self-center ml-1">+{count - 40} more</span>}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function PassivePlant() {
  const sessionId   = useSessionId();
  const qc          = useQueryClient();
  const { toast }   = useToast();
  const [screenH, setScreenH] = useState("");
  const [appH, setAppH]       = useState("");

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
      toast({ title: "Usage tracked ✓", description: msg });
      setScreenH(""); setAppH("");
      invalidate();
    },
    onError: () => toast({ title: "Failed to track", variant: "destructive" }),
  });

  const claimMut = useMutation({
    mutationFn: (id: number) =>
      apiFetch("/api/rewards/claim", { method: "POST", body: JSON.stringify({ sessionId, reward_id: id }) }),
    onSuccess: () => { toast({ title: "Reward claimed! 🎉" }); invalidate(); },
    onError: () => toast({ title: "Failed to claim", variant: "destructive" }),
  });

  const summary   = summaryQ.data;
  const trees     = treesQ.data ?? [];
  const treeMap   = mapQ.data ?? [];
  const rewards   = rewardsQ.data ?? [];
  const history   = historyQ.data ?? [];
  const unclaimed = rewards.filter(r => !r.isClaimed);
  const hasHistory = history.some(d => d.screenHours > 0 || d.treesPlanted > 0);

  const totalPlanted = summary?.total_trees_planted ?? 0;

  const stats = [
    { icon: "🌳", label: "Trees Planted",  value: `${totalPlanted}`,                             color: "#059669", delay: 0    },
    { icon: "📱", label: "Screen Hours",   value: `${(summary?.total_screen_hours ?? 0).toFixed(1)}h`, color: "#3b82f6", delay: 0.06 },
    { icon: "💨", label: "CO₂ Offset",    value: `${(summary?.total_co2_offset   ?? 0).toFixed(3)} kg`, color: "#0d9488", delay: 0.12 },
    { icon: "🪙", label: "Coins Earned",  value: `${summary?.coins_earned ?? 0}`,                  color: "#d97706", delay: 0.18 },
  ];

  return (
    <div className="p-5 md:p-8 max-w-5xl mx-auto space-y-7">

      {/* ── Header ── */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3">
          <span className="text-4xl">🌱</span>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-gray-900">PassivePlant</h1>
            <p className="text-sm text-gray-400 mt-0.5">Use your phone normally — trees grow in the background</p>
          </div>
        </div>
      </motion.div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map(s => <StatCard key={s.label} {...s} />)}
      </div>

      {/* ── 7-Day History Chart ── */}
      <motion.div
        className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm"
        initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, ease: "easeOut" }}
      >
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <span className="text-lg">📊</span>
            <h2 className="font-bold text-gray-800 text-sm">7-Day Activity</h2>
          </div>
          <div className="flex items-center gap-4 text-[10px] text-gray-400">
            <span className="flex items-center gap-1">
              <span className="inline-block w-2.5 h-2.5 rounded-sm bg-blue-400" />Screen hours
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-2.5 h-2 rounded-full bg-emerald-500" />Trees
            </span>
          </div>
        </div>

        {!hasHistory ? (
          <div className="flex flex-col items-center justify-center h-36 text-center">
            <div className="text-3xl mb-2">📱</div>
            <div className="text-sm text-gray-400 font-medium">No usage logged yet</div>
            <div className="text-xs text-gray-300 mt-1">Log your first session to see your chart</div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <ComposedChart data={history} margin={{ top: 4, right: 16, left: -12, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="#f1f5f9" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: "#9ca3af" }}
                axisLine={false} tickLine={false}
              />
              <YAxis
                yAxisId="hours"
                orientation="left"
                tick={{ fontSize: 10, fill: "#9ca3af" }}
                axisLine={false} tickLine={false}
                tickFormatter={v => `${v}h`}
              />
              <YAxis
                yAxisId="trees"
                orientation="right"
                tick={{ fontSize: 10, fill: "#059669" }}
                axisLine={false} tickLine={false}
                tickFormatter={v => `${v}🌳`}
                width={38}
              />
              <Tooltip
                contentStyle={{
                  background: "white", border: "1px solid #e5e7eb",
                  borderRadius: 12, fontSize: 11, boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
                }}
                formatter={(value: number, name: string) =>
                  name === "screenHours" ? [`${value}h`, "Screen time"] : [`${value}`, "Trees planted"]
                }
                labelStyle={{ color: "#6b7280", fontWeight: 600, marginBottom: 4 }}
              />
              <Bar
                yAxisId="hours" dataKey="screenHours"
                fill="#93c5fd" radius={[5, 5, 0, 0]}
                maxBarSize={40}
              />
              <Line
                yAxisId="trees" dataKey="treesPlanted" type="monotone"
                stroke="#059669" strokeWidth={2.5} dot={{ fill: "#059669", r: 3, strokeWidth: 0 }}
                activeDot={{ r: 5, fill: "#059669" }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </motion.div>

      {/* ── Two-column: Tracker + Tree Visualization ── */}
      <div className="grid gap-5 md:grid-cols-2">

        {/* Phone Usage Tracker */}
        <Section title="Log Phone Usage" icon={Smartphone} iconColor="#3b82f6" delay={0.22}>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">Screen Time (hours)</label>
              <input
                type="number" min="0" step="0.5" placeholder="e.g. 3.5"
                value={screenH} onChange={e => setScreenH(e.target.value)}
                className="w-full px-3 py-2.5 text-sm rounded-xl border border-gray-200 bg-gray-50 focus:outline-none focus:border-blue-400 focus:bg-white transition-colors"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">Active App Usage (hours, optional)</label>
              <input
                type="number" min="0" step="0.5" placeholder="e.g. 2.0"
                value={appH} onChange={e => setAppH(e.target.value)}
                className="w-full px-3 py-2.5 text-sm rounded-xl border border-gray-200 bg-gray-50 focus:outline-none focus:border-blue-400 focus:bg-white transition-colors"
              />
            </div>
            <motion.button
              onClick={() => {
                if (!screenH) return;
                trackMut.mutate({ screen_time_hours: +screenH, app_usage_hours: +(appH || 0) });
              }}
              disabled={!screenH || trackMut.isPending}
              className="w-full py-2.5 rounded-xl text-sm font-bold text-white bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed"
              whileHover={{ scale: 1.02, boxShadow: "0 6px 20px rgba(0,0,0,0.10)", transition: { duration: 0.14 } }}
              whileTap={{ scale: 0.97 }}
            >
              {trackMut.isPending ? "Tracking…" : "Track & Earn Trees 🌱"}
            </motion.button>
          </div>

          {/* Formula */}
          <div className="mt-4 p-3 rounded-xl bg-emerald-50 border border-emerald-100">
            <div className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider mb-1">How it works</div>
            <div className="text-xs text-emerald-600 leading-relaxed space-y-0.5">
              <div>📱 Screen time → CO₂ footprint (0.01 kg/hr)</div>
              <div>🌱 1 tree planted for every 2 hours of use</div>
              <div>🪙 Each tree = 10 coins in your Eco Wallet</div>
            </div>
          </div>
        </Section>

        {/* Tree visualization */}
        <Section title="Your Forest" icon={TreePine} iconColor="#059669" delay={0.26}>
          {totalPlanted === 0 ? (
            <div className="text-center py-8">
              <div className="text-5xl mb-3">🌱</div>
              <div className="text-sm text-gray-500 font-medium">Your forest starts here</div>
              <div className="text-xs text-gray-400 mt-1">Log 2+ hours of screen time to plant your first tree</div>
            </div>
          ) : (
            <>
              <TreeGrid count={totalPlanted} />
              <div className="mt-3 pt-3 border-t border-gray-100 space-y-1.5 max-h-40 overflow-y-auto pr-1">
                {trees.slice(0, 8).map((t, i) => (
                  <motion.div
                    key={t.id}
                    className="flex items-center gap-2.5 py-1.5"
                    initial={{ opacity: 0, x: 6 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                  >
                    <span className="text-base shrink-0">🌳</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-gray-700 truncate">{t.projectName}</div>
                      <div className="text-[9px] text-gray-400">📍 {t.location}</div>
                    </div>
                    <div className="text-xs font-bold text-emerald-600 shrink-0">×{t.treesPlanted}</div>
                  </motion.div>
                ))}
              </div>
            </>
          )}
        </Section>
      </div>

      {/* ── Rewards + Forest Map ── */}
      <div className="grid gap-5 md:grid-cols-2">

        {/* Passive Rewards */}
        <Section title="Passive Rewards" icon={Gift} iconColor="#9333ea" delay={0.3}>
          {unclaimed.length > 0 && (
            <div className="mb-3 flex items-center gap-2 text-xs font-semibold text-purple-700 bg-purple-50 border border-purple-100 rounded-lg px-3 py-2">
              <Gift className="w-3.5 h-3.5" />
              {unclaimed.length} reward{unclaimed.length > 1 ? "s" : ""} ready to claim
            </div>
          )}
          {rewards.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-2">🎁</div>
              <div className="text-xs text-gray-400">Plant 5+ trees in one session to unlock rewards</div>
            </div>
          ) : (
            <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
              {rewards.map(r => (
                <div
                  key={r.id}
                  className={`flex items-center gap-3 p-3 rounded-xl border ${r.isClaimed ? "bg-gray-50 border-gray-100" : "bg-purple-50 border-purple-100"}`}
                >
                  <span className="text-xl shrink-0">
                    {r.rewardType === "tree" ? "🌳" : r.rewardType === "coin" ? "🪙" : "🎫"}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-gray-700 capitalize">{r.rewardType} reward</div>
                    <div className="text-[9px] text-gray-400">
                      {r.rewardValue} {r.rewardType === "coin" ? "coins" : r.rewardType === "tree" ? "trees" : "₹ off"}
                    </div>
                  </div>
                  {r.isClaimed ? (
                    <span className="text-[9px] text-gray-400 shrink-0">Claimed ✓</span>
                  ) : (
                    <motion.button
                      onClick={() => claimMut.mutate(r.id)}
                      disabled={claimMut.isPending}
                      className="text-[10px] font-bold px-3 py-1 rounded-lg bg-purple-600 text-white shrink-0"
                      whileHover={{ scale: 1.05, transition: { duration: 0.12 } }}
                      whileTap={{ scale: 0.93 }}
                    >
                      Claim
                    </motion.button>
                  )}
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* Forest Map */}
        <Section title="Forest Locations" icon={MapPin} iconColor="#ef4444" delay={0.34}>
          {treeMap.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-2">🗺️</div>
              <div className="text-xs text-gray-400">Plant trees to see your global forest map</div>
            </div>
          ) : (
            <div className="space-y-4">
              {treeMap.map((loc, i) => {
                const maxT = Math.max(...treeMap.map(l => l.totalTrees), 1);
                return (
                  <div key={loc.location}>
                    <div className="flex justify-between items-baseline mb-1">
                      <span className="text-xs font-medium text-gray-700 flex items-center gap-1">
                        <span>📍</span>{loc.location}
                      </span>
                      <span className="text-xs font-bold text-emerald-600">{loc.totalTrees} trees</span>
                    </div>
                    <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ background: "linear-gradient(90deg, #059669, #10b981)" }}
                        initial={{ width: 0 }}
                        animate={{ width: `${(loc.totalTrees / maxT) * 100}%` }}
                        transition={{ duration: 0.9, delay: i * 0.08, ease: "easeOut" }}
                      />
                    </div>
                    <div className="text-[9px] text-gray-400 mt-0.5">{loc.totalCo2.toFixed(3)} kg CO₂ offset</div>
                  </div>
                );
              })}
            </div>
          )}
        </Section>
      </div>

      {/* ── Leaderboard teaser ── */}
      <motion.div
        className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-100 rounded-2xl p-5 flex items-center gap-4"
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
      >
        <Trophy className="w-8 h-8 text-emerald-600 shrink-0" />
        <div>
          <div className="text-sm font-bold text-gray-800">Community Impact</div>
          <div className="text-xs text-gray-500 mt-0.5">
            {treeMap.reduce((s, l) => s + l.totalTrees, 0)} trees planted across {treeMap.length} forest{treeMap.length !== 1 ? "s" : ""} by all EcoTrace users
          </div>
        </div>
        <div className="ml-auto text-3xl">🌍</div>
      </motion.div>

    </div>
  );
}
