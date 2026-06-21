import { useState } from "react";
import { useSessionId } from "@/hooks/use-session";
import {
  useGetActivitySummary,
  getGetActivitySummaryQueryKey,
} from "@workspace/api-client-react";
import { motion, AnimatePresence } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Sparkles, RefreshCw, Leaf, Zap, ShoppingBag, Car, Home, Target, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

interface CoachTip {
  category: string;
  tip: string;
  impact: string;
  effort: "low" | "medium" | "high";
}

interface CoachAdvice {
  message: string;
  tips: CoachTip[];
  focusArea: string;
  weeklyGoal: string;
}

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  transport: <Car className="h-3.5 w-3.5" />,
  food: <Leaf className="h-3.5 w-3.5" />,
  energy: <Home className="h-3.5 w-3.5" />,
  shopping: <ShoppingBag className="h-3.5 w-3.5" />,
};

// Elegant, theme-aware category borders and tags
const CATEGORY_STYLES: Record<string, { tag: string; border: string; glow: string }> = {
  transport: {
    tag: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20",
    border: "border-l-sky-500 dark:border-l-sky-500/80",
    glow: "shadow-[0_0_15px_rgba(14,165,233,0.08)]",
  },
  food: {
    tag: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    border: "border-l-emerald-500 dark:border-l-emerald-500/80",
    glow: "shadow-[0_0_15px_rgba(16,185,129,0.08)]",
  },
  energy: {
    tag: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    border: "border-l-amber-500 dark:border-l-amber-500/80",
    glow: "shadow-[0_0_15px_rgba(245,158,11,0.08)]",
  },
  shopping: {
    tag: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
    border: "border-l-purple-500 dark:border-l-purple-500/80",
    glow: "shadow-[0_0_15px_rgba(168,85,247,0.08)]",
  },
};

const EFFORT_COLORS: Record<string, string> = {
  low: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20",
  medium: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20",
  high: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20",
};

// Framer motion variants for premium transitions
const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 100, damping: 15 } },
};

export default function Coach() {
  const { t } = useTranslation();
  const sessionId = useSessionId();
  const [advice, setAdvice] = useState<CoachAdvice | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasAsked, setHasAsked] = useState(false);

  const { data: summary } = useGetActivitySummary(
    { sessionId: sessionId!, days: 30 },
    { query: { enabled: !!sessionId, queryKey: getGetActivitySummaryQueryKey({ sessionId: sessionId!, days: 30 }) } }
  );

  async function fetchAdvice() {
    if (!sessionId) return;
    setLoading(true);
    setError(null);
    setHasAsked(true);
    try {
      const res = await fetch("/api/coach/advice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? t("coachPage.errorMsg"));
        return;
      }
      setAdvice(data as CoachAdvice);
    } catch {
      setError(t("coachPage.errorMsg"));
    } finally {
      setLoading(false);
    }
  }

  const vs = summary
    ? summary.dailyAverage < summary.globalAverage
      ? t("coachPage.belowAvg", { pct: ((1 - summary.dailyAverage / summary.globalAverage) * 100).toFixed(0) })
      : t("coachPage.aboveAvg", { pct: ((summary.dailyAverage / summary.globalAverage - 1) * 100).toFixed(0) })
    : null;

  // Determine forest growth visual based on carbon performance
  // dailyAverage < globalAverage means good score!
  const isPerformingWell = summary ? summary.dailyAverage <= summary.globalAverage : true;
  const ecoScore = summary
    ? Math.min(100, Math.max(10, Math.round((summary.globalAverage / (summary.dailyAverage || 1)) * 50)))
    : 50;

  const forestGrowthEmoji = ecoScore <= 30 ? "🌱" : ecoScore <= 55 ? "🌿" : ecoScore <= 75 ? "🌳" : "🌲";

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-6">
      {/* Premium Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-[var(--eco-primary)]/10 dark:bg-[var(--eco-primary)]/20 flex items-center justify-center shadow-[0_0_15px_rgba(22,163,74,0.15)] border border-[var(--eco-primary)]/20">
            <Sparkles className="h-5 w-5 text-[var(--eco-primary)] animate-pulse" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-foreground via-foreground to-emerald-600 dark:to-emerald-400 bg-clip-text text-transparent">
              {t("coachPage.title")}
            </h1>
            <p className="text-muted-foreground text-xs mt-0.5">{t("coachPage.desc")}</p>
          </div>
        </div>
      </div>

      {/* Stats Preview: Upgraded to Glassmorphism Card */}
      {summary && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="saas-card relative overflow-hidden border border-border/60 shadow-[var(--shadow-soft)] p-5"
        >
          {/* Subtle Glows */}
          <div className="absolute right-0 top-0 w-24 h-24 bg-[var(--eco-primary)]/5 rounded-full blur-2xl pointer-events-none" />

          <p className="text-xs font-semibold text-muted-foreground tracking-wider uppercase mb-3">
            {t("coachPage.last30days")}
          </p>

          <div className="grid grid-cols-3 gap-4 relative z-10">
            <div className="space-y-1">
              <span className="text-[10px] text-muted-foreground block">{t("coachPage.totalCo2")}</span>
              <div className="text-xl font-bold flex items-baseline">
                {summary.totalCo2.toFixed(1)}
                <span className="text-xs font-medium text-muted-foreground ml-1">kg</span>
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] text-muted-foreground block">{t("coachPage.dailyAvg")}</span>
              <div className="text-xl font-bold flex items-baseline">
                {summary.dailyAverage.toFixed(1)}
                <span className="text-xs font-medium text-muted-foreground ml-1">kg/d</span>
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] text-muted-foreground block">{t("coachPage.vsGlobal")}</span>
              <div>
                <span className={cn(
                  "text-xs font-bold px-2 py-0.5 rounded-full",
                  summary.dailyAverage < summary.globalAverage
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                    : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                )}>
                  {vs}
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* CTA before first request: Replaced with Animated Forest Growth Intro */}
      {!hasAsked && (
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          className="saas-card p-8 text-center relative overflow-hidden border border-emerald-500/20 dark:border-emerald-500/30 shadow-[0_4px_30px_rgba(22,163,74,0.05)] bg-[var(--bg-glass)] backdrop-blur-xl"
        >
          {/* Decorative glowing gradient spheres */}
          <div className="absolute -right-24 -top-24 w-48 h-48 bg-[var(--eco-primary)]/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -left-24 -bottom-24 w-48 h-48 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

          {/* Plant Growth animation container */}
          <div className="relative w-24 h-24 mx-auto mb-6 flex items-center justify-center">
            <div className="absolute inset-0 bg-[var(--eco-primary)]/10 rounded-full blur-xl animate-pulse" />
            <motion.div
              initial={{ scale: 0.5, rotate: -20 }}
              animate={{ 
                scale: [0.9, 1.1, 0.9],
                rotate: [0, 6, -6, 0]
              }}
              transition={{ 
                scale: { repeat: Infinity, duration: 4, ease: "easeInOut" },
                rotate: { repeat: Infinity, duration: 5, ease: "easeInOut" }
              }}
              className="relative z-10 text-5xl select-none"
            >
              {forestGrowthEmoji}
            </motion.div>
          </div>

          <h2 className="text-lg font-bold mb-2 tracking-tight text-foreground">{t("coachPage.readyTitle")}</h2>
          <p className="text-muted-foreground text-xs mb-6 max-w-sm mx-auto leading-relaxed">
            {t("coachPage.readyDesc")}
          </p>

          <Button
            size="default"
            className="interactive gap-2 px-8 py-5 bg-[var(--eco-primary)] hover:bg-[var(--eco-best)] text-white font-semibold text-xs rounded-xl shadow-md hover:shadow-[var(--glow-green)] transition-all duration-300"
            onClick={fetchAdvice}
            disabled={loading || !sessionId}
          >
            <Sparkles className="h-4 w-4" />
            {t("coachPage.getCta")}
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </motion.div>
      )}

      {/* Loading Skeleton */}
      {loading && (
        <div className="space-y-4">
          <Skeleton className="h-28 w-full rounded-2xl bg-muted/40" />
          <Skeleton className="h-16 w-full rounded-2xl bg-muted/40" />
          <Skeleton className="h-24 w-full rounded-2xl bg-muted/40" />
          <Skeleton className="h-24 w-full rounded-2xl bg-muted/40" />
          <Skeleton className="h-20 w-full rounded-2xl bg-muted/40" />
        </div>
      )}

      {/* Error state */}
      {error && !loading && (
        <div className="saas-card border border-destructive/20 bg-destructive/5 rounded-2xl p-6 text-center shadow-lg">
          <p className="text-destructive font-semibold text-sm mb-4">{error}</p>
          <Button variant="outline" size="sm" onClick={fetchAdvice} className="gap-2 rounded-xl border-destructive/20 hover:bg-destructive/10 text-destructive">
            <RefreshCw className="h-3.5 w-3.5 animate-spin" /> {t("coachPage.tryAgain")}
          </Button>
        </div>
      )}

      {/* Advice results with Premium animations */}
      <AnimatePresence>
        {advice && !loading && (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="space-y-5"
          >
            {/* AI Coach Chat Bubble - Elevated glassmorphism with glowing ring */}
            <motion.div
              variants={itemVariants}
              className="saas-card relative overflow-hidden border border-[var(--eco-primary)]/20 bg-[var(--bg-glass)] shadow-[0_0_25px_rgba(22,163,74,0.06)] backdrop-blur-xl rounded-2xl p-5"
            >
              {/* Pulsing indicator */}
              <div className="absolute top-4 right-4 flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                Active Coach
              </div>

              <div className="flex gap-4">
                {/* AI Avatar */}
                <div className="h-10 w-10 shrink-0 rounded-xl bg-gradient-to-tr from-[var(--eco-primary)] to-emerald-400 flex items-center justify-center shadow-md relative">
                  <span className="text-lg">🤖</span>
                </div>

                <div className="space-y-1">
                  <p className="font-bold text-xs text-[var(--eco-primary)] uppercase tracking-widest">{t("coachPage.says")}</p>
                  <p className="text-sm leading-relaxed text-foreground font-medium">{advice.message}</p>
                </div>
              </div>
            </motion.div>

            {/* Focus Area Opportunity Card */}
            <motion.div
              variants={itemVariants}
              className="saas-card flex items-center gap-4 border border-amber-500/20 bg-amber-500/5 shadow-sm rounded-2xl p-4"
            >
              <div className="h-9 w-9 shrink-0 rounded-xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
                <Zap className="h-4.5 w-4.5 text-amber-500 animate-pulse" />
              </div>
              <div>
                <p className="text-[9px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-widest mb-0.5">{t("coachPage.opportunity")}</p>
                <p className="text-sm font-semibold text-foreground">{advice.focusArea}</p>
              </div>
            </motion.div>

            {/* Tips Section */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground pl-1">Personalized Tips</h3>
              {advice.tips.map((tip, i) => {
                const styles = CATEGORY_STYLES[tip.category] || {
                  tag: "bg-muted text-muted-foreground border-muted",
                  border: "border-l-muted",
                  glow: "",
                };
                return (
                  <motion.div
                    key={i}
                    variants={itemVariants}
                    className={cn(
                      "saas-card border-l-4 hover:scale-[1.015] hover:shadow-md transition-all duration-300",
                      styles.border,
                      styles.glow
                    )}
                  >
                    <div className="flex items-center justify-between gap-3 mb-2.5">
                      <div className={cn("flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[9px] font-bold uppercase tracking-wider", styles.tag)}>
                        {CATEGORY_ICONS[tip.category]}
                        {t(`coachPage.categories.${tip.category}`) ?? tip.category}
                      </div>
                      <span className={cn("text-[9px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider", EFFORT_COLORS[tip.effort] ?? "bg-muted text-muted-foreground")}>
                        {t(`coachPage.effort.${tip.effort}`) ?? tip.effort}
                      </span>
                    </div>
                    <p className="text-sm font-semibold leading-snug mb-3 text-foreground">{tip.tip}</p>
                    <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-bold">
                      <Leaf className="h-4 w-4 text-[var(--eco-primary)]" />
                      {tip.impact}
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Weekly Goal Card */}
            <motion.div
              variants={itemVariants}
              className="saas-card relative overflow-hidden border border-[var(--eco-primary)]/20 bg-emerald-500/5 shadow-md rounded-2xl p-5"
            >
              <div className="absolute right-0 bottom-0 w-24 h-24 bg-[var(--eco-primary)]/5 rounded-full blur-2xl pointer-events-none" />

              <div className="flex items-center gap-2 mb-2 relative z-10">
                <div className="h-7 w-7 rounded-lg bg-[var(--eco-primary)]/10 flex items-center justify-center border border-[var(--eco-primary)]/25">
                  <Target className="h-4 w-4 text-[var(--eco-primary)]" />
                </div>
                <p className="font-bold text-sm text-[var(--eco-primary)] tracking-tight">{t("coachPage.weeklyGoalTitle")}</p>
              </div>
              <p className="text-sm text-foreground font-medium leading-relaxed relative z-10">{advice.weeklyGoal}</p>
            </motion.div>

            {/* Refresh / Generate New */}
            <motion.div
              variants={itemVariants}
              className="flex justify-center pt-2"
            >
              <Button
                variant="outline"
                size="sm"
                onClick={fetchAdvice}
                disabled={loading}
                className="gap-2 rounded-xl text-xs border-border/80 hover:bg-emerald-500/10 hover:text-[var(--eco-primary)] hover:border-[var(--eco-primary)]/30 px-5 py-4 transition-all duration-300"
              >
                <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
                {t("coachPage.refresh")}
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
