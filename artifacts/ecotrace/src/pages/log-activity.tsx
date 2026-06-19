import { useState } from "react";
import { useSessionId } from "@/hooks/use-session";
import { useCreateActivity, getGetActivitySummaryQueryKey, getListActivitiesQueryKey, getGetActivityStreakQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CATEGORY_COLORS, CATEGORY_LABELS, ACTIVITY_TYPES } from "@/lib/constants";
import { ActivityCategory } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion, AnimatePresence } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle2, ArrowRight, RotateCcw, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LogResult {
  co2Amount: number;
  activityLabel: string;
  category: string;
  value: number;
  unit: string;
}

const CO2_FACTORS: Record<string, number> = {
  car_km: 0.21,
  bus_km: 0.089,
  train_km: 0.041,
  flight_km: 0.255,
  beef_meal: 6.61,
  chicken_meal: 3.05,
  vegetarian_meal: 1.1,
  vegan_meal: 0.7,
  electricity_kwh: 0.233,
  natural_gas_m3: 2.04,
  new_clothing: 5.5,
  electronics_device: 70.0,
  online_purchase: 0.5,
};

export default function LogActivity() {
  const sessionId = useSessionId();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [category, setCategory] = useState<ActivityCategory | null>(null);
  const [activityType, setActivityType] = useState<string | null>(null);
  const [value, setValue] = useState<string>("");
  const [result, setResult] = useState<LogResult | null>(null);

  const createActivity = useCreateActivity();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionId || !category || !activityType || !value || isNaN(Number(value))) return;

    try {
      await createActivity.mutateAsync({
        data: { sessionId, category, activityType, value: Number(value) }
      });

      if (sessionId) {
        queryClient.invalidateQueries({ queryKey: getGetActivitySummaryQueryKey({ sessionId }) });
        queryClient.invalidateQueries({ queryKey: getListActivitiesQueryKey({ sessionId }) });
        queryClient.invalidateQueries({ queryKey: getGetActivityStreakQueryKey({ sessionId }) });
      }

      const factor = CO2_FACTORS[activityType] ?? 0;
      const co2Amount = +(Number(value) * factor).toFixed(2);
      const activityDef = ACTIVITY_TYPES[category].find((a) => a.id === activityType);

      setResult({
        co2Amount,
        activityLabel: activityDef?.label ?? activityType,
        category,
        value: Number(value),
        unit: activityDef?.unit ?? "",
      });
    } catch {
      toast({ title: "Error", description: "Failed to log activity. Please try again.", variant: "destructive" });
    }
  };

  const handleReset = () => {
    setCategory(null);
    setActivityType(null);
    setValue("");
    setResult(null);
  };

  const selectedActivityDef = category && activityType
    ? ACTIVITY_TYPES[category as keyof typeof ACTIVITY_TYPES].find((a) => a.id === activityType)
    : null;

  const previewCo2 = activityType && value && !isNaN(Number(value))
    ? +((CO2_FACTORS[activityType] ?? 0) * Number(value)).toFixed(2)
    : null;

  const impactLevel = (kg: number) => {
    if (kg < 1) return { label: "Low impact", color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200" };
    if (kg < 5) return { label: "Moderate impact", color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-950/20 border-amber-200" };
    return { label: "High impact", color: "text-red-600", bg: "bg-red-50 dark:bg-red-950/20 border-red-200" };
  };

  return (
    <div className="p-6 md:p-8 max-w-2xl mx-auto min-h-[calc(100vh-5rem)]">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Log Activity</h1>
        <p className="text-muted-foreground mt-1">Record an action and see its exact carbon impact instantly.</p>
      </div>

      <AnimatePresence mode="wait">
        {result ? (
          /* ── Result card ── */
          <motion.div
            key="result"
            initial={{ opacity: 0, scale: 0.96, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
          >
            <Card className={cn("shadow-lg border-2", impactLevel(result.co2Amount).bg)}>
              <CardContent className="py-10 flex flex-col items-center text-center gap-5">
                <CheckCircle2 className="h-14 w-14 text-emerald-500" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-1">Activity logged</p>
                  <h2 className="text-2xl font-bold text-foreground">{result.activityLabel}</h2>
                  <p className="text-muted-foreground text-sm mt-1">{result.value} {result.unit} · {result.category}</p>
                </div>

                <div className="flex flex-col items-center gap-1">
                  <span className="text-5xl font-black text-foreground">{result.co2Amount}</span>
                  <span className="text-lg font-semibold text-muted-foreground">kg CO₂ emitted</span>
                  <span className={cn("text-sm font-medium mt-1 px-3 py-1 rounded-full border", impactLevel(result.co2Amount).bg, impactLevel(result.co2Amount).color)}>
                    {impactLevel(result.co2Amount).label}
                  </span>
                </div>

                {/* Equivalent facts */}
                <div className="grid grid-cols-2 gap-3 w-full max-w-sm text-sm">
                  <div className="rounded-xl bg-muted/50 p-3 text-center">
                    <div className="font-bold text-foreground">{(result.co2Amount / 0.255).toFixed(0)} km</div>
                    <div className="text-muted-foreground text-xs mt-0.5">flight equivalent</div>
                  </div>
                  <div className="rounded-xl bg-muted/50 p-3 text-center">
                    <div className="font-bold text-foreground">{(result.co2Amount / 21.77).toFixed(2)}</div>
                    <div className="text-muted-foreground text-xs mt-0.5">trees/year to offset</div>
                  </div>
                </div>

                <div className="flex gap-3 pt-2 w-full max-w-sm">
                  <Button onClick={handleReset} variant="outline" className="flex-1 gap-2">
                    <RotateCcw className="h-4 w-4" /> Log Another
                  </Button>
                  <Link href="/insights" className="flex-1">
                    <Button className="w-full bg-emerald-700 hover:bg-emerald-800 text-white gap-2">
                      <BarChart3 className="h-4 w-4" /> View Insights
                    </Button>
                  </Link>
                </div>
                <Link href="/dashboard">
                  <button className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
                    Back to Dashboard <ArrowRight className="h-3 w-3" />
                  </button>
                </Link>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          /* ── Log form ── */
          <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Card className="w-full shadow-sm">
              <CardHeader>
                <CardTitle className="text-xl">What did you do?</CardTitle>
                <CardDescription>Record an action to see its carbon impact.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-8">
                  {/* Category */}
                  <div className="space-y-3">
                    <Label className="text-base font-semibold">1. Select Category</Label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {(Object.keys(CATEGORY_LABELS) as ActivityCategory[]).map((cat) => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => { setCategory(cat); setActivityType(null); setValue(""); }}
                          className={cn(
                            "flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all",
                            category === cat
                              ? "border-primary bg-primary/5 shadow-sm"
                              : "border-transparent bg-muted/50 hover:bg-muted"
                          )}
                        >
                          <span className={cn("text-lg font-medium", category === cat ? "text-primary" : "text-foreground")}>
                            {CATEGORY_LABELS[cat]}
                          </span>
                          <span className={cn("mt-1 text-2xl", CATEGORY_COLORS[cat])}>•</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Activity type */}
                  <AnimatePresence mode="popLayout">
                    {category && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-3 overflow-hidden"
                      >
                        <Label className="text-base font-semibold">2. What did you do?</Label>
                        <div className="grid sm:grid-cols-2 gap-3">
                          {ACTIVITY_TYPES[category].map((act) => (
                            <button
                              key={act.id}
                              type="button"
                              onClick={() => { setActivityType(act.id); if (!value) setValue("1"); }}
                              className={cn(
                                "flex items-center gap-3 p-3 rounded-xl border transition-all text-left",
                                activityType === act.id
                                  ? "border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20"
                                  : "border-border bg-card hover:bg-muted/30"
                              )}
                            >
                              <div className={cn("p-2 rounded-lg", activityType === act.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
                                <act.icon className="h-5 w-5" />
                              </div>
                              <div>
                                <div className={cn("font-medium text-sm", activityType === act.id ? "text-primary" : "text-foreground")}>{act.label}</div>
                                <div className="text-xs text-muted-foreground mt-0.5">per {act.unit}</div>
                              </div>
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Quantity */}
                  <AnimatePresence mode="popLayout">
                    {activityType && selectedActivityDef && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-3 overflow-hidden"
                      >
                        <Label className="text-base font-semibold">3. How much?</Label>
                        <div className="flex gap-4 items-center">
                          <div className="relative flex-1 max-w-[200px]">
                            <Input
                              type="number" min="0.1" step="0.1" required
                              value={value}
                              onChange={(e) => setValue(e.target.value)}
                              className="text-lg py-6 pl-4 pr-16 bg-muted/20 border-border/60 focus-visible:ring-primary/30"
                            />
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium">
                              {selectedActivityDef.unit}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Live CO₂ preview */}
                  <AnimatePresence>
                    {previewCo2 !== null && previewCo2 > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className={cn("rounded-xl border p-4 flex items-center gap-4", impactLevel(previewCo2).bg)}
                      >
                        <div className="flex-1">
                          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Estimated CO₂</p>
                          <p className={cn("text-3xl font-black mt-0.5", impactLevel(previewCo2).color)}>{previewCo2} kg</p>
                        </div>
                        <div className="text-right text-xs text-muted-foreground">
                          <div>= {(previewCo2 / 0.255).toFixed(0)} km flight</div>
                          <div className="mt-0.5">{impactLevel(previewCo2).label}</div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="pt-2 border-t">
                    <Button
                      type="submit"
                      className="w-full py-6 text-lg rounded-xl shadow-sm"
                      disabled={!category || !activityType || !value || isNaN(Number(value)) || createActivity.isPending}
                    >
                      {createActivity.isPending ? (
                        <><Loader2 className="mr-2 h-5 w-5 animate-spin" />Saving…</>
                      ) : "Log Impact"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
