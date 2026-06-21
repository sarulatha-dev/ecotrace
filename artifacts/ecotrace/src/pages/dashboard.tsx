import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { useSessionId } from "@/hooks/use-session";
import CountUp from "react-countup";
import { CircularProgress } from "@/components/CircularProgress";
import { AnimatedBarChart } from "@/components/AnimatedBarChart";
import { GlobeCard } from "@/components/GlobeCard";
import { FloatingCard } from "@/components/FloatingCard";
import {
  useGetActivitySummary, getGetActivitySummaryQueryKey,
  useListActivities, getListActivitiesQueryKey,
  useGetActivityStreak, getGetActivityStreakQueryKey,
  useListChallenges, getListChallengesQueryKey,
  useListChallengeCompletions, getListChallengeCompletionsQueryKey,
  useCompleteChallenge,
  useCreateActivity,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
  X, Plus, Zap, Trophy, Flame, CheckCircle2, Circle,
  TreePine, Plane, Activity, RefreshCw, Globe as GlobeIcon
} from "lucide-react";
import { LivingForest } from "@/components/living-forest";
import { useLogState } from "@/hooks/use-log-state";

// ─── Carbon & Forest Levels ──────────────────────────────────────────────────
type CarbonLevel = "low" | "medium" | "high";
type ModuleKey   = "carbon" | "energy" | "travel" | "ecoscore" | null;

// Get dynamic carbon color according to negative feedback system
function getCarbonColor(totalCo2: number): string {
  if (totalCo2 < 30) return "#22C55E";      // carbon-low
  if (totalCo2 < 60) return "#EAB308";      // carbon-warning
  if (totalCo2 < 120) return "#F97316";     // carbon-medium
  return "#DC2626";                         // carbon-high
}

function getCarbonLevel(kg: number): CarbonLevel {
  if (kg < 50)  return "low";
  if (kg < 150) return "medium";
  return "high";
}

// 0-20 -> gray dead, 20-40 -> low, 40-60 -> mid, 60-80 -> good, 80-100 -> best
function getForestColor(score: number): string {
  if (score <= 20) return "#3F3F46";
  if (score <= 40) return "#65A30D";
  if (score <= 60) return "#22C55E";
  if (score <= 80) return "#4ADE80";
  return "#166534";
}

function getForestEmoji(score: number): string {
  if (score <= 20) return "🍂";
  if (score <= 40) return "🌱";
  if (score <= 60) return "🌿";
  if (score <= 80) return "🌳";
  return "🌲";
}

function getForestLabel(score: number): string {
  if (score <= 20) return "Barren 🍂";
  if (score <= 40) return "Sprouting 🌱";
  if (score <= 60) return "Growing 🌿";
  if (score <= 80) return "Thriving 🌳";
  return "Forest Champion 🌲";
}

// ─── Modules ─────────────────────────────────────────────────────────────────
function CarbonTrackerCard({ totalCo2, dailyAverage, level, color, onClick }: {
  totalCo2: number; dailyAverage: number; level: CarbonLevel; color: string; onClick: () => void;
}) {
  const { t } = useTranslation();
  return (
    <FloatingCard>
      <div onClick={onClick} className="cursor-pointer flex flex-col justify-between h-full hover:scale-[1.01] transition-transform duration-200">
        <div className="flex items-center gap-1.5 mb-2">
          <Activity className="w-3.5 h-3.5 animate-pulse" style={{ color }} />
          <span className="text-[10px] font-bold tracking-[0.18em] uppercase text-foreground/80">{t("dashboard.carbonTracker")}</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative shrink-0 flex items-center justify-center p-1 bg-primary/10 rounded-full border border-primary/20 shadow-inner">
            <CircularProgress value={totalCo2} max={Math.max(totalCo2, 100)} color={color} size={84} thickness={7} />
          </div>
          <div className="min-w-0">
            <div className="text-[9px] text-muted-foreground mb-0.5">{t("dashboard.sevenDayTotal")}</div>
            <div className="text-xl font-black leading-none truncate" style={{ color }}>
              <CountUp end={totalCo2} decimals={1} duration={1.2} />
            </div>
            <div className="text-[9px] text-muted-foreground mt-1">kg CO₂</div>
            <div className="mt-1 text-[8px] font-bold tracking-widest truncate uppercase" style={{ color }}>
              {t(`dashboard.rating${level.charAt(0).toUpperCase() + level.slice(1)}`)}
            </div>
            <div className="text-[9px] text-muted-foreground mt-1">{t("dashboard.avgPerDay", { avg: dailyAverage.toFixed(1) })}</div>
          </div>
        </div>
      </div>
    </FloatingCard>
  );
}

function EcoScoreCard({ score, streak, color, onClick }: {
  score: number; streak: number; color: string; onClick: () => void;
}) {
  const { t } = useTranslation();
  const forestColor = getForestColor(score);
  const forestEmoji = getForestEmoji(score);
  const forestLabel = getForestLabel(score);

  return (
    <FloatingCard>
      <div onClick={onClick} className="cursor-pointer text-center flex flex-col justify-between h-full hover:scale-[1.01] transition-transform duration-200">
        <div className="flex items-center justify-center gap-1.5 mb-2">
          <Trophy className="w-3.5 h-3.5" style={{ color: forestColor }} />
          <span className="text-[10px] font-bold tracking-[0.18em] uppercase text-foreground/80">{t("dashboard.ecoScore")}</span>
        </div>
        <div className="my-1">
          <span className="text-4xl font-black leading-none" style={{ color: forestColor }}>
            <CountUp end={score} duration={1.5} />
          </span>
          <span className="text-[10px] text-muted-foreground ml-1">/ 100</span>
        </div>
        <div className="flex items-center justify-center gap-1 text-[9px] mb-2 text-muted-foreground">
          <Flame className="w-3 h-3 text-orange-500 animate-bounce" />
          <span>{t("dashboard.dayStreak", { streak })}</span>
        </div>
        <div
          className="text-[9px] font-bold tracking-widest px-2.5 py-0.5 rounded-full inline-block truncate"
          style={{ color: forestColor, background: `${forestColor}15`, border: `1px solid ${forestColor}30` }}
        >
          {forestLabel}
        </div>
      </div>
    </FloatingCard>
  );
}

function EnergyUsageCard({ activities, color, onClick }: {
  activities: { category: string; co2Amount: number }[]; color: string; onClick: () => void;
}) {
  const { t } = useTranslation();
  const cats = [
    { cat: "transport", icon: "🚗" },
    { cat: "energy",    icon: "⚡" },
    { cat: "food",      icon: "🥩" },
    { cat: "shopping",  icon: "🛍️" },
  ];
  const totals  = cats.map(({ cat, icon }) => ({
    category: cat,
    value: activities.filter(a => a.category === cat).reduce((s, a) => s + a.co2Amount, 0),
  }));

  return (
    <FloatingCard>
      <div onClick={onClick} className="cursor-pointer flex flex-col justify-between h-full hover:scale-[1.01] transition-transform duration-200">
        <div className="flex items-center gap-1.5 mb-2">
          <Zap className="w-3.5 h-3.5" style={{ color }} />
          <span className="text-[10px] font-bold tracking-[0.18em] uppercase text-foreground/80">{t("dashboard.energyUsage")}</span>
        </div>
        <div className="my-1.5">
          <AnimatedBarChart data={totals} color={color} />
        </div>
        <div className="flex justify-between items-center text-[8px] text-muted-foreground pt-1 border-t border-border/40">
          <span>🚗 Transit</span>
          <span>⚡ Utility</span>
          <span>🥩 Diet</span>
          <span>🛍️ Shop</span>
        </div>
      </div>
    </FloatingCard>
  );
}

function TravelImpactCard({ flightHours, trees, color, onClick }: {
  flightHours: number; trees: number; color: string; onClick: () => void;
}) {
  const { t } = useTranslation();
  return (
    <FloatingCard>
      <div onClick={onClick} className="cursor-pointer flex flex-col justify-between h-full hover:scale-[1.01] transition-transform duration-200">
        <div className="flex items-center gap-1.5 mb-1.5">
          <Plane className="w-3.5 h-3.5" style={{ color }} />
          <span className="text-[10px] font-bold tracking-[0.18em] uppercase text-foreground/80">{t("dashboard.travelImpact")}</span>
        </div>
        <svg viewBox="0 0 160 36" className="w-full my-1.5" height={24}>
          <motion.path
            d="M 8 24 Q 40 8 80 16 Q 120 24 152 8"
            fill="none" stroke={color} strokeWidth={2}
            strokeDasharray="4 3"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 2.2, ease: "easeOut" }}
          />
          <motion.text x={144} y={12} fontSize={12} fill={color}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            transition={{ delay: 1.8, duration: 0.4 }}
          >✈</motion.text>
        </svg>
        <div className="flex gap-2 justify-between items-center mt-1">
          <div>
            <div className="text-base font-black text-foreground leading-none">
              <CountUp end={flightHours} decimals={1} duration={1.2} />
              <span className="text-[9px] text-muted-foreground font-normal ml-0.5">hr</span>
            </div>
            <div className="text-[8px] text-muted-foreground">{t("dashboard.flightEquiv")}</div>
          </div>
          <div className="w-px h-6 bg-border" />
          <div>
            <div className="text-base font-black leading-none" style={{ color }}>
              <CountUp end={trees} duration={1.2} />
            </div>
            <div className="text-[8px] text-muted-foreground flex items-center gap-0.5 mt-0.5">
              <TreePine className="w-2.5 h-2.5" style={{ color }} /> {t("dashboard.treesNeeded")}
            </div>
          </div>
        </div>
      </div>
    </FloatingCard>
  );
}

// ─── Detail Modal ─────────────────────────────────────────────────────────────
function DetailModal({ module, onClose, color, totalCo2, dailyAverage, flightHours, trees, streak, score, activities }: {
  module: ModuleKey; onClose: () => void; color: string;
  totalCo2: number; dailyAverage: number; flightHours: number;
  trees: number; streak: number; score: number;
  activities: { category: string; activityLabel: string; co2Amount: number; loggedAt: string }[];
}) {
  const { t } = useTranslation();
  if (!module) return null;

  const panels: Record<NonNullable<ModuleKey>, React.ReactNode> = {
    carbon: (
      <>
        <p className="text-xl font-bold text-foreground mb-4">{t("dashboard.carbonBreakdown")}</p>
        <div className="grid grid-cols-2 gap-3 mb-5">
          {[
            { label: t("dashboard.sevenDayTotal"),   value: `${totalCo2.toFixed(2)} kg` },
            { label: t("dashboard.weeklyAverage"), value: `${dailyAverage.toFixed(2)} kg` },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-xl p-3 bg-secondary/50 border border-border/50">
              <div className="text-[9px] text-muted-foreground mb-1">{label}</div>
              <div className="text-base font-bold" style={{ color }}>{value}</div>
            </div>
          ))}
        </div>
        <div className="space-y-1 max-h-52 overflow-y-auto pr-1">
          {activities.slice(0, 10).map((a, i) => (
            <div key={i} className="flex items-center justify-between py-2 border-b border-border/40">
              <div>
                <div className="text-xs font-medium text-foreground/90">{a.activityLabel}</div>
                <div className="text-[9px] text-muted-foreground">{new Date(a.loggedAt).toLocaleDateString()}</div>
              </div>
              <div className="text-xs font-semibold" style={{ color }}>{a.co2Amount.toFixed(2)} kg</div>
            </div>
          ))}
          {activities.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">{t("dashboard.noActivities")}</p>}
        </div>
      </>
    ),
    energy: (
      <>
        <p className="text-xl font-bold text-foreground mb-4">{t("dashboard.energyUsage")}</p>
        {["transport", "energy", "food", "shopping"].map(cat => {
          const val  = activities.filter(a => a.category === cat).reduce((s, a) => s + a.co2Amount, 0);
          const icons: Record<string, string> = { transport: "🚗", energy: "⚡", food: "🥩", shopping: "🛍️" };
          return (
            <div key={cat} className="flex items-center justify-between py-3 border-b border-border/40">
              <span className="text-sm text-foreground/80">{icons[cat]} {t(`logActivity.categories.${cat}`)}</span>
              <span className="text-sm font-bold" style={{ color }}>{val.toFixed(2)} kg CO₂</span>
            </div>
          );
        })}
      </>
    ),
    travel: (
      <>
        <p className="text-xl font-bold text-foreground mb-5">{t("dashboard.travelImpact")}</p>
        <div className="space-y-4">
          {[
            { Icon: Plane,    val: `${flightHours.toFixed(1)} hours`, sub: t("dashboard.flightEquiv") },
            { Icon: TreePine, val: `${trees.toFixed(0)} ${t("dashboard.treesNeeded")}`,       sub: t("dashboard.treesNeeded") },
          ].map(({ Icon, val, sub }) => (
            <div key={sub} className="flex items-center gap-4 rounded-xl p-4 bg-secondary/50 border border-border/50">
              <Icon className="w-7 h-7 shrink-0" style={{ color }} />
              <div>
                <div className="text-xl font-black text-foreground">{val}</div>
                <div className="text-[10px] text-muted-foreground">{sub}</div>
              </div>
            </div>
          ))}
        </div>
      </>
    ),
    ecoscore: (
      <>
        <p className="text-xl font-bold text-foreground mb-4">{t("dashboard.ecoScore")}</p>
        <div className="flex flex-col items-center py-2 mb-4">
          <div className="text-7xl font-black mb-1" style={{ color: getForestColor(score) }}>{score}</div>
          <div className="text-muted-foreground text-sm">/ 100</div>
        </div>
        <div className="space-y-1">
          {[
            { label: t("dashboard.dayStreak", { streak }), value: `${streak} 🔥` },
            { label: t("dashboard.ecoScore"),         value: score >= 70 ? t("dashboard.ratingHero") : score >= 40 ? t("dashboard.ratingImproving") : t("dashboard.ratingNeedsWork") },
          ].map(({ label, value }) => (
            <div key={label} className="flex justify-between items-center py-3 border-b border-border/40">
              <span className="text-sm text-muted-foreground">{label}</span>
              <span className="text-sm font-semibold" style={{ color: getForestColor(score) }}>{value}</span>
            </div>
          ))}
        </div>
      </>
    ),
  };

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
        <motion.div
          className="relative z-10 w-full max-w-md p-6 rounded-3xl bg-card border border-border shadow-2xl"
          initial={{ scale: 0.88, y: 20, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.88, y: 20, opacity: 0 }}
          transition={{ type: "spring", damping: 26, stiffness: 240 }}
          onClick={e => e.stopPropagation()}
          style={{
            border: `1px solid ${color}25`,
            boxShadow: `0 20px 60px ${color}10`,
          }}
        >
          <button
            className="absolute top-4 right-4 p-2 rounded-xl transition-colors hover:bg-muted"
            onClick={onClose}
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
          {panels[module!]}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ─── Challenges Strip ─────────────────────────────────────────────────────────
function ChallengesStrip({ challenges, completions, onComplete, color }: {
  challenges: { id: number; title: string; description: string; icon: string; co2Reduction: number; difficulty: string }[];
  completions: { challengeId: number }[];
  onComplete: (id: number) => void;
  color: string;
}) {
  const { t } = useTranslation();
  const done = new Set(completions.map(c => c.challengeId));

  return (
    <div className="px-4 md:px-6 pb-8">
      <div className="flex items-center gap-2 mb-4">
        <Trophy className="w-4 h-4" style={{ color }} />
        <span className="text-xs font-bold tracking-[0.22em] uppercase text-foreground/80">{t("dashboard.activeChallenges")}</span>
        <span className="text-xs text-muted-foreground ml-1">{t("dashboard.tapToComplete")}</span>
      </div>

      <div
        className="flex gap-3 overflow-x-auto pb-2"
        style={{ scrollbarWidth: "none" } as React.CSSProperties}
      >
        {challenges.slice(0, 8).map((ch, i) => {
          const completed = done.has(ch.id);
          const c = completed ? "#059669" : color;
          return (
            <motion.div
              key={ch.id}
              className={cn(
                "flex-shrink-0 w-48 rounded-2xl p-4 cursor-pointer backdrop-blur-md transition-all duration-200",
                completed
                  ? "bg-primary/10 border border-primary/30"
                  : "bg-card border border-border"
              )}
              animate={{ y: [0, -4, 0] }}
              transition={{ duration: 3 + i * 0.3, repeat: Infinity, ease: "easeInOut", delay: i * 0.12 }}
              whileHover={{
                scale: 1.05, y: -6,
                boxShadow: `0 12px 32px ${c}12`,
                transition: { duration: 0.18 },
              }}
              whileTap={{ scale: 0.97 }}
              onClick={() => !completed && onComplete(ch.id)}
            >
              <div className="flex items-start justify-between mb-2">
                <span className="text-2xl">{ch.icon}</span>
                {completed
                  ? <CheckCircle2 className="w-4 h-4 text-primary" />
                  : <Circle className="w-4 h-4 text-border" />
                }
              </div>
              <div className="text-xs font-semibold text-foreground mb-1 leading-tight">{ch.title}</div>
              <div className="text-[9px] text-muted-foreground mb-2 leading-tight">{ch.description}</div>
              <div className="text-[10px] font-bold" style={{ color: c }}>-{ch.co2Reduction} kg CO₂</div>
              <div className="text-[8px] text-muted-foreground/60 mt-0.5 capitalize">{ch.difficulty}</div>
            </motion.div>
          );
        })}
        {challenges.length === 0 && (
          <p className="text-sm text-muted-foreground py-4">{t("dashboard.noActivities")}</p>
        )}
      </div>
    </div>
  );
}

// ─── Quick Log FAB ────────────────────────────────────────────────────────────
function QuickLogFAB({ color, sessionId, onLogged }: {
  color: string; sessionId: string; onLogged: () => void;
}) {
  const { t } = useTranslation();
  const [open, setOpen]   = useState(false);
  const [km, setKm]       = useState("");
  const [kwh, setKwh]     = useState("");
  const [meals, setMeals] = useState("");
  const [busy, setBusy]   = useState(false);
  const createActivity    = useCreateActivity();
  const { toast }         = useToast();

  const handleLog = async () => {
    if (!km && !kwh && !meals) return;
    try {
      setBusy(true);
      const tasks = [];
      if (km    && +km    > 0) tasks.push(createActivity.mutateAsync({ data: { sessionId, category: "transport", activityType: "car_km",        value: +km    } }));
      if (kwh   && +kwh   > 0) tasks.push(createActivity.mutateAsync({ data: { sessionId, category: "energy",    activityType: "electricity_kwh", value: +kwh   } }));
      if (meals && +meals > 0) tasks.push(createActivity.mutateAsync({ data: { sessionId, category: "food",      activityType: "beef_meal",       value: +meals } }));
      await Promise.all(tasks);
      setKm(""); setKwh(""); setMeals("");
      setOpen(false);
      toast({ title: t("logActivity.success"), description: "Emissions recorded." });
      onLogged();
    } catch {
      toast({ title: t("logActivity.error"), variant: "destructive" });
    } finally { setBusy(false); }
  };

  return (
    <div className="fixed bottom-24 md:bottom-8 right-5 z-40">
      <AnimatePresence>
        {open && (
          <motion.div
            className="absolute bottom-16 right-0 w-72 p-5 rounded-3xl bg-card border border-border shadow-lg"
            initial={{ opacity: 0, y: 10, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.94 }}
            transition={{ type: "spring", damping: 22, stiffness: 300 }}
            style={{
              boxShadow: `0 16px 48px ${color}20`,
            }}
          >
            <div className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
              <Plus className="w-4 h-4" style={{ color }} /> {t("dashboard.quickLog")}
            </div>
            <div className="space-y-2.5">
              {[
                { placeholder: "🚗 Transport km",    value: km,    set: setKm    },
                { placeholder: "⚡ Electricity kWh", value: kwh,   set: setKwh   },
                { placeholder: "🥩 Meat meals",      value: meals, set: setMeals },
              ].map(({ placeholder, value, set }) => (
                <input
                  key={placeholder}
                  type="number" step="any" min="0"
                  placeholder={placeholder}
                  value={value}
                  onChange={e => set(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-border bg-muted/30 text-foreground outline-none focus:border-emerald-400 focus:bg-background transition-colors"
                />
              ))}
              <motion.button
                onClick={handleLog}
                disabled={busy}
                className="w-full py-2.5 rounded-xl text-sm font-bold text-white"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                style={{
                  background: color,
                  opacity: busy ? 0.65 : 1,
                  cursor: busy ? "not-allowed" : "pointer",
                  boxShadow: `0 4px 14px ${color}30`,
                }}
              >
                {busy ? t("dashboard.logging") : t("dashboard.logEmissions")}
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        className="w-14 h-14 rounded-full flex items-center justify-center text-white font-bold shadow-lg"
        style={{ background: color, boxShadow: `0 6px 20px ${color}30` }}
        whileHover={{ scale: 1.1, boxShadow: `0 10px 28px ${color}45`, transition: { duration: 0.18 } }}
        whileTap={{ scale: 0.93 }}
        onClick={() => setOpen(o => !o)}
      >
        <motion.div animate={{ rotate: open ? 45 : 0 }} transition={{ duration: 0.2 }}>
          <Plus className="w-6 h-6" />
        </motion.div>
      </motion.button>
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const { t } = useTranslation();
  const sessionId   = useSessionId();
  const queryClient = useQueryClient();
  const [activeModule, setActiveModule] = useState<ModuleKey>(null);
  const [selectedRegion, setSelectedRegion] = useState<string>("My Profile");
  const [hasLogged, setHasLogged] = useLogState();

  const summaryQ = useGetActivitySummary(
    { sessionId: sessionId!, days: 7 },
    { query: { enabled: !!sessionId, queryKey: getGetActivitySummaryQueryKey({ sessionId: sessionId!, days: 7 }) } }
  );
  const activitiesQ = useListActivities(
    { sessionId: sessionId! },
    { query: { enabled: !!sessionId, queryKey: getListActivitiesQueryKey({ sessionId: sessionId! }) } }
  );
  const streakQ = useGetActivityStreak(
    { sessionId: sessionId! },
    { query: { enabled: !!sessionId, queryKey: getGetActivityStreakQueryKey({ sessionId: sessionId! }) } }
  );
  const challengesQ = useListChallenges(
    { query: { queryKey: getListChallengesQueryKey() } }
  );
  const completionsQ = useListChallengeCompletions(
    { sessionId: sessionId! },
    { query: { enabled: !!sessionId, queryKey: getListChallengeCompletionsQueryKey({ sessionId: sessionId! }) } }
  );
  const completeChallenge = useCompleteChallenge({
    mutation: {
      onSuccess: () => {
        if (sessionId) queryClient.invalidateQueries({ queryKey: getListChallengeCompletionsQueryKey({ sessionId }) });
      },
    },
  });

  // Region mock data database
  const regionData: Record<string, {
    totalCo2: number;
    dailyAverage: number;
    trees: number;
    flightHours: number;
    ecoScore: number;
    carbonLevel: CarbonLevel;
    color: string;
    activities: { category: string; co2Amount: number }[];
  }> = {
    "Global": {
      totalCo2: 48.5,
      dailyAverage: 6.9,
      trees: 5,
      flightHours: 2.4,
      ecoScore: 76,
      carbonLevel: "medium",
      color: "#F97316",
      activities: [
        { category: "transport", co2Amount: 18.2 },
        { category: "energy", co2Amount: 15.1 },
        { category: "food", co2Amount: 10.2 },
        { category: "shopping", co2Amount: 5.0 },
      ]
    },
    "North America": {
      totalCo2: 120.2,
      dailyAverage: 17.1,
      trees: 12,
      flightHours: 6.0,
      ecoScore: 40,
      carbonLevel: "high",
      color: "#DC2626",
      activities: [
        { category: "transport", co2Amount: 50.4 },
        { category: "energy", co2Amount: 38.2 },
        { category: "food", co2Amount: 20.1 },
        { category: "shopping", co2Amount: 11.5 },
      ]
    },
    "Europe": {
      totalCo2: 62.4,
      dailyAverage: 8.9,
      trees: 6,
      flightHours: 3.1,
      ecoScore: 69,
      carbonLevel: "medium",
      color: "#F97316",
      activities: [
        { category: "transport", co2Amount: 22.1 },
        { category: "energy", co2Amount: 18.5 },
        { category: "food", co2Amount: 14.3 },
        { category: "shopping", co2Amount: 7.5 },
      ]
    },
    "Asia-Pacific": {
      totalCo2: 35.1,
      dailyAverage: 5.0,
      trees: 3,
      flightHours: 1.8,
      ecoScore: 82,
      carbonLevel: "low",
      color: "#22C55E",
      activities: [
        { category: "transport", co2Amount: 12.0 },
        { category: "energy", co2Amount: 10.1 },
        { category: "food", co2Amount: 8.5 },
        { category: "shopping", co2Amount: 4.5 },
      ]
    },
    "South Asia": {
      totalCo2: 28.5,
      dailyAverage: 4.1,
      trees: 3,
      flightHours: 1.4,
      ecoScore: 85,
      carbonLevel: "low",
      color: "#22C55E",
      activities: [
        { category: "transport", co2Amount: 8.5 },
        { category: "energy", co2Amount: 9.0 },
        { category: "food", co2Amount: 7.0 },
        { category: "shopping", co2Amount: 4.0 },
      ]
    },
    "Australia": {
      totalCo2: 55.8,
      dailyAverage: 8.0,
      trees: 6,
      flightHours: 2.8,
      ecoScore: 72,
      carbonLevel: "medium",
      color: "#F97316",
      activities: [
        { category: "transport", co2Amount: 20.3 },
        { category: "energy", co2Amount: 16.5 },
        { category: "food", co2Amount: 12.0 },
        { category: "shopping", co2Amount: 7.0 },
      ]
    }
  };

  const myTotalCo2     = summaryQ.data?.totalCo2            ?? 0;
  const myDailyAverage = summaryQ.data?.dailyAverage         ?? 0;
  const myTrees        = summaryQ.data?.treeEquivalent        ?? 0;
  const myFlightHours  = summaryQ.data?.flightHoursEquivalent ?? 0;
  const myActivities   = activitiesQ.data ?? [];
  const streak         = streakQ.data?.currentStreak          ?? 0;
  const challenges     = challengesQ.data ?? [];
  const completions    = completionsQ.data ?? [];
  
  const myCarbonColor = getCarbonColor(myTotalCo2);
  const myCarbonLevel = getCarbonLevel(myTotalCo2);
  const myEcoScore    = Math.max(0, Math.min(100, Math.round(100 - myTotalCo2 / 2)));

  // Resolve active stats based on selection
  const isMyProfile = selectedRegion === "My Profile";
  const activeStats = isMyProfile 
    ? {
        totalCo2: myTotalCo2,
        dailyAverage: myDailyAverage,
        trees: myTrees,
        flightHours: myFlightHours,
        ecoScore: myEcoScore,
        carbonLevel: myCarbonLevel,
        color: myCarbonColor,
        activities: myActivities
      }
    : {
        ...regionData[selectedRegion],
        activities: regionData[selectedRegion].activities.map(a => ({
          ...a,
          activityLabel: t(`logActivity.categories.${a.category}`),
          loggedAt: new Date().toISOString()
        }))
      };

  const invalidateAll = () => {
    if (!sessionId) return;
    queryClient.invalidateQueries({ queryKey: getListActivitiesQueryKey({ sessionId }) });
    queryClient.invalidateQueries({ queryKey: getGetActivitySummaryQueryKey({ sessionId, days: 7 }) });
  };

  const globeBg = {
    low:    "linear-gradient(135deg, rgba(34,197,94,0.1) 0%, rgba(246,255,249,0.3) 100%)",
    medium: "linear-gradient(135deg, rgba(249,115,22,0.08) 0%, rgba(246,255,249,0.3) 100%)",
    high:   "linear-gradient(135deg, rgba(220,38,38,0.08) 0%, rgba(246,255,249,0.3) 100%)",
  }[activeStats.carbonLevel];

  const ratingKey = activeStats.carbonLevel === "low" ? "ratingHero" : activeStats.carbonLevel === "medium" ? "ratingImproving" : "ratingNeedsWork";

  return (
    <div className="relative space-y-4">
      {/* ── Compact Globe & Stats Grid (SaaS-style) ── */}
      <div className="relative saas-card overflow-hidden p-6 flex flex-col lg:flex-row items-center gap-6" style={{ background: globeBg }}>
        {/* Globe Visual Area */}
        <div className="relative w-full lg:w-1/3 h-[240px] shrink-0 flex flex-col items-center justify-center bg-black/5 rounded-2xl border border-border/40">
          <GlobeCard 
            level={activeStats.carbonLevel} 
            onRegionSelect={(r) => setSelectedRegion(r)} 
            selectedRegion={selectedRegion}
          />
          
          {/* Status badge / reset overlaid on globe */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-center pointer-events-auto z-10 flex flex-col items-center gap-1.5">
            <div className="text-[9px] font-bold tracking-[0.2em] uppercase text-muted-foreground">{t("dashboard.carbonStatus")}</div>
            <div className="flex gap-2">
              <span
                className="text-[10px] px-3 py-1 rounded-full font-bold tracking-wider inline-block bg-card border border-border shadow-lg"
                style={{ color: activeStats.color }}
              >
                {t(`dashboard.${ratingKey}`)}
              </span>
              {!isMyProfile && (
                <button
                  onClick={() => setSelectedRegion("My Profile")}
                  className="flex items-center gap-1 text-[9px] font-semibold text-primary bg-primary/10 border border-primary/20 px-2.5 py-1 rounded-full hover:bg-primary/20 transition-colors shadow-lg"
                >
                  <RefreshCw className="w-2.5 h-2.5" />
                  My Profile
                </button>
              )}
            </div>
          </div>

          {/* Region title helper */}
          <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-card border border-border px-2.5 py-1 rounded-lg">
            <GlobeIcon className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-[10px] font-bold text-foreground">{selectedRegion}</span>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-4 self-stretch">
          <CarbonTrackerCard
            totalCo2={activeStats.totalCo2} dailyAverage={activeStats.dailyAverage}
            level={activeStats.carbonLevel} color={activeStats.color}
            onClick={() => setActiveModule("carbon")}
          />
          <EcoScoreCard score={activeStats.ecoScore} streak={streak} color={activeStats.color} onClick={() => setActiveModule("ecoscore")} />
          <EnergyUsageCard activities={activeStats.activities} color={activeStats.color} onClick={() => setActiveModule("energy")} />
          <TravelImpactCard flightHours={activeStats.flightHours} trees={activeStats.trees} color={activeStats.color} onClick={() => setActiveModule("travel")} />
        </div>
      </div>

      {/* Living Forest System */}
      <div className="mt-3">
        <LivingForest score={activeStats.ecoScore} isRed={hasLogged} />
      </div>

      {/* Challenges */}
      <ChallengesStrip
        challenges={challenges} completions={completions} color={activeStats.color}
        onComplete={id => {
          if (!sessionId || completeChallenge.isPending) return;
          completeChallenge.mutate({ id, data: { sessionId } });
        }}
      />

      {/* FAB */}
      {sessionId && (
        <QuickLogFAB
          color={activeStats.color}
          sessionId={sessionId}
          onLogged={() => {
            setHasLogged(true);
            invalidateAll();
          }}
        />
      )}

      {/* Detail Modal */}
      {activeModule && (
        <DetailModal
          module={activeModule} onClose={() => setActiveModule(null)}
          color={activeStats.color} totalCo2={activeStats.totalCo2} dailyAverage={activeStats.dailyAverage}
          flightHours={activeStats.flightHours} trees={activeStats.trees} streak={streak}
          score={activeStats.ecoScore} activities={activeStats.activities}
        />
      )}
    </div>
  );
}
