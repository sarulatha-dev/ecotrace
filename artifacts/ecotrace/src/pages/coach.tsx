import { useState } from "react";
import { useSessionId } from "@/hooks/use-session";
import {
  useGetActivitySummary,
  getGetActivitySummaryQueryKey,
} from "@workspace/api-client-react";
import { motion, AnimatePresence } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, RefreshCw, Leaf, Zap, ShoppingBag, Car, Home, ChevronRight, Target } from "lucide-react";
import { cn } from "@/lib/utils";

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
  transport: <Car className="h-4 w-4" />,
  food: <Leaf className="h-4 w-4" />,
  energy: <Home className="h-4 w-4" />,
  shopping: <ShoppingBag className="h-4 w-4" />,
};

const CATEGORY_COLORS: Record<string, string> = {
  transport: "bg-blue-100 text-blue-700 border-blue-200",
  food: "bg-green-100 text-green-700 border-green-200",
  energy: "bg-amber-100 text-amber-700 border-amber-200",
  shopping: "bg-purple-100 text-purple-700 border-purple-200",
};

const CATEGORY_LABELS: Record<string, string> = {
  transport: "Transport",
  food: "Food & Diet",
  energy: "Home Energy",
  shopping: "Shopping",
};

const EFFORT_COLORS: Record<string, string> = {
  low: "bg-emerald-100 text-emerald-700",
  medium: "bg-amber-100 text-amber-700",
  high: "bg-rose-100 text-rose-700",
};

const EFFORT_LABELS: Record<string, string> = {
  low: "Easy win",
  medium: "Some effort",
  high: "Big change",
};

export default function Coach() {
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
        setError(data.error ?? "Couldn't reach the coach right now — please try again.");
        return;
      }
      setAdvice(data as CoachAdvice);
    } catch {
      setError("Couldn't reach the coach right now — please try again.");
    } finally {
      setLoading(false);
    }
  }

  const vs = summary
    ? summary.dailyAverage < summary.globalAverage
      ? `${((1 - summary.dailyAverage / summary.globalAverage) * 100).toFixed(0)}% below global average`
      : `${((summary.dailyAverage / summary.globalAverage - 1) * 100).toFixed(0)}% above global average`
    : null;

  return (
    <div className="p-6 md:p-8 max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">AI Coach</h1>
            <p className="text-muted-foreground text-sm">Personalized tips based on your actual data</p>
          </div>
        </div>
      </div>

      {/* Stats preview */}
      {summary && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card border rounded-2xl p-5 mb-6"
        >
          <p className="text-sm font-medium text-muted-foreground mb-3">Your last 30 days</p>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <div className="text-2xl font-bold">{summary.totalCo2.toFixed(1)}<span className="text-sm font-normal text-muted-foreground ml-1">kg</span></div>
              <div className="text-xs text-muted-foreground mt-0.5">Total CO₂</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{summary.dailyAverage.toFixed(1)}<span className="text-sm font-normal text-muted-foreground ml-1">kg/day</span></div>
              <div className="text-xs text-muted-foreground mt-0.5">Daily avg</div>
            </div>
            <div>
              <div className={cn("text-sm font-semibold mt-1", summary.dailyAverage < summary.globalAverage ? "text-green-600" : "text-amber-600")}>
                {vs}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">vs. global</div>
            </div>
          </div>
        </motion.div>
      )}

      {/* CTA before first request */}
      {!hasAsked && (
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20 rounded-2xl p-8 text-center mb-6"
        >
          <div className="text-4xl mb-4">🌱</div>
          <h2 className="text-xl font-semibold mb-2">Ready for your personalised plan?</h2>
          <p className="text-muted-foreground text-sm mb-6 max-w-sm mx-auto">
            Your AI coach will analyse your footprint data and generate 3 targeted tips — specific to your biggest impact areas.
          </p>
          <Button
            size="lg"
            className="gap-2 px-8 rounded-xl"
            onClick={fetchAdvice}
            disabled={loading || !sessionId}
          >
            <Sparkles className="h-5 w-5" />
            Get My Personalised Tips
          </Button>
        </motion.div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-4">
          <Skeleton className="h-28 w-full rounded-2xl" />
          <Skeleton className="h-36 w-full rounded-2xl" />
          <Skeleton className="h-36 w-full rounded-2xl" />
          <Skeleton className="h-36 w-full rounded-2xl" />
          <Skeleton className="h-20 w-full rounded-2xl" />
        </div>
      )}

      {/* Error state */}
      {error && !loading && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-2xl p-5 text-center mb-6">
          <p className="text-destructive font-medium mb-3">{error}</p>
          <Button variant="outline" onClick={fetchAdvice} className="gap-2">
            <RefreshCw className="h-4 w-4" /> Try Again
          </Button>
        </div>
      )}

      {/* Advice results */}
      <AnimatePresence>
        {advice && !loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4"
          >
            {/* Coach message */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="bg-primary text-primary-foreground rounded-2xl p-6"
            >
              <div className="flex gap-3">
                <div className="text-2xl flex-shrink-0">🤖</div>
                <div>
                  <p className="font-medium text-sm opacity-75 mb-1">Your AI Coach says</p>
                  <p className="leading-relaxed">{advice.message}</p>
                </div>
              </div>
            </motion.div>

            {/* Focus area */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-accent/10 border border-accent/20 rounded-2xl p-4 flex items-center gap-3"
            >
              <Zap className="h-5 w-5 text-accent flex-shrink-0" />
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-0.5">Biggest Opportunity</p>
                <p className="font-medium">{advice.focusArea}</p>
              </div>
            </motion.div>

            {/* Tips */}
            <div className="space-y-3">
              {advice.tips.map((tip, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 + i * 0.07 }}
                  className="bg-card border rounded-2xl p-5 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className={cn("flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold", CATEGORY_COLORS[tip.category] ?? "bg-muted text-muted-foreground border-muted")}>
                      {CATEGORY_ICONS[tip.category]}
                      {CATEGORY_LABELS[tip.category] ?? tip.category}
                    </div>
                    <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full", EFFORT_COLORS[tip.effort] ?? "bg-muted text-muted-foreground")}>
                      {EFFORT_LABELS[tip.effort] ?? tip.effort}
                    </span>
                  </div>
                  <p className="font-medium leading-snug mb-2">{tip.tip}</p>
                  <div className="flex items-center gap-1.5 text-sm text-emerald-600 font-medium">
                    <Leaf className="h-3.5 w-3.5" />
                    {tip.impact}
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Weekly goal */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.38 }}
              className="bg-card border-2 border-primary/20 rounded-2xl p-5"
            >
              <div className="flex items-center gap-2 mb-2">
                <Target className="h-5 w-5 text-primary" />
                <p className="font-semibold text-primary">Your Goal This Week</p>
              </div>
              <p className="text-foreground leading-snug">{advice.weeklyGoal}</p>
            </motion.div>

            {/* Refresh */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.45 }}
              className="flex justify-center pt-2"
            >
              <Button
                variant="outline"
                onClick={fetchAdvice}
                disabled={loading}
                className="gap-2 rounded-xl"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh Advice
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
