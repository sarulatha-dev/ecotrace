import { useState } from "react";
import { useSessionId } from "@/hooks/use-session";
import {
  useGetActivitySummary, getGetActivitySummaryQueryKey,
  useListActivities, getListActivitiesQueryKey,
  useCreateActivity,
  useGetActivityStreak, getGetActivityStreakQueryKey,
  useGetGoal, getGetGoalQueryKey,
  useSetGoal,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { Link } from "wouter";
import {
  Activity, Globe, TreePine, Plane, PlusCircle, Car, Zap, Utensils,
  Flame, BarChart3, CreditCard, ArrowRight
} from "lucide-react";

export default function Dashboard() {
  const sessionId = useSessionId();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [transport, setTransport] = useState<string>("");
  const [electricity, setElectricity] = useState<string>("");
  const [food, setFood] = useState<string>("");
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [goalInput, setGoalInput] = useState<string>("");
  const [savingGoal, setSavingGoal] = useState<boolean>(false);

  const summaryQuery = useGetActivitySummary(
    { sessionId: sessionId!, days: 7 },
    { query: { enabled: !!sessionId, queryKey: getGetActivitySummaryQueryKey({ sessionId: sessionId!, days: 7 }) } }
  );

  const activitiesQuery = useListActivities(
    { sessionId: sessionId! },
    { query: { enabled: !!sessionId, queryKey: getListActivitiesQueryKey({ sessionId: sessionId! }) } }
  );

  const streakQuery = useGetActivityStreak(
    { sessionId: sessionId! },
    { query: { enabled: !!sessionId, queryKey: getGetActivityStreakQueryKey({ sessionId: sessionId! }) } }
  );

  const goalQuery = useGetGoal(
    { sessionId: sessionId! },
    { query: { enabled: !!sessionId, queryKey: getGetGoalQueryKey({ sessionId: sessionId! }) } }
  );

  const setGoalMutation = useSetGoal();
  const createActivity = useCreateActivity();

  const summary = summaryQuery.data;
  const activities = activitiesQuery.data ?? [];
  const streak = streakQuery.data;
  const goal = goalQuery.data?.dailyCo2Goal ?? null;
  const loading = summaryQuery.isLoading || activitiesQuery.isLoading;

  const todayCo2 = activities
    .filter((a) => {
      const d = new Date(a.loggedAt);
      const today = new Date();
      return d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth() && d.getDate() === today.getDate();
    })
    .reduce((sum, a) => sum + a.co2Amount, 0);

  const goalProgress = goal && goal > 0 ? Math.min((todayCo2 / goal) * 100, 100) : 0;
  const goalExceeded = goal !== null && todayCo2 > goal;

  const totalCo2 = summary?.totalCo2 ?? 0;
  const dailyAverage = summary?.dailyAverage ?? 0;
  const treeEquivalent = summary?.treeEquivalent ?? 0;
  const flightHoursEquivalent = summary?.flightHoursEquivalent ?? 0;

  const handleAddRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionId) return;
    if (!transport && !electricity && !food) {
      toast({ title: "Input error", description: "Please enter at least one value.", variant: "destructive" });
      return;
    }
    try {
      setSubmitting(true);
      const promises: Promise<unknown>[] = [];
      if (transport && Number(transport) > 0)
        promises.push(createActivity.mutateAsync({ data: { sessionId, category: "transport", activityType: "car_km", value: Number(transport) } }));
      if (electricity && Number(electricity) > 0)
        promises.push(createActivity.mutateAsync({ data: { sessionId, category: "energy", activityType: "electricity_kwh", value: Number(electricity) } }));
      if (food && Number(food) > 0)
        promises.push(createActivity.mutateAsync({ data: { sessionId, category: "food", activityType: "beef_meal", value: Number(food) } }));
      await Promise.all(promises);
      setTransport(""); setElectricity(""); setFood("");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: getListActivitiesQueryKey({ sessionId }) }),
        queryClient.invalidateQueries({ queryKey: getGetActivitySummaryQueryKey({ sessionId, days: 7 }) }),
        queryClient.invalidateQueries({ queryKey: getGetActivityStreakQueryKey({ sessionId }) }),
      ]);
      toast({ title: "Record logged", description: "Successfully logged emissions." });
    } catch {
      toast({ title: "Submission failed", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionId || !goalInput || Number(goalInput) <= 0) return;
    try {
      setSavingGoal(true);
      await setGoalMutation.mutateAsync({ data: { sessionId, dailyCo2Goal: Number(goalInput) } });
      await queryClient.invalidateQueries({ queryKey: getGetGoalQueryKey({ sessionId }) });
      setGoalInput("");
      toast({ title: "Goal saved", description: `Daily target set to ${goalInput} kg CO₂.` });
    } catch {
      toast({ title: "Failed to save goal", variant: "destructive" });
    } finally {
      setSavingGoal(false);
    }
  };

  if (loading && activities.length === 0) {
    return (
      <div className="p-6 md:p-8 space-y-6 max-w-5xl mx-auto">
        <Skeleton className="h-10 w-48 mb-8" />
        <div className="grid gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-[380px]" />
          <Skeleton className="h-[380px]" />
        </div>
      </div>
    );
  }

  const containerVariants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.09 } } };
  const itemVariants = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0 } };

  return (
    <motion.div className="p-6 md:p-8 space-y-7 max-w-5xl mx-auto" variants={containerVariants} initial="hidden" animate="show">
      {/* Header */}
      <div>
        <motion.h1 variants={itemVariants} className="text-3xl font-bold tracking-tight bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">
          EcoTrace Dashboard
        </motion.h1>
        <motion.p variants={itemVariants} className="text-muted-foreground mt-1">
          Your daily carbon footprint at a glance.
        </motion.p>
      </div>

      {/* Goal Progress */}
      {goal !== null && (
        <motion.div variants={itemVariants}>
          <Card className={`shadow-md border ${goalExceeded ? "border-red-200 bg-red-50 dark:bg-red-950/20" : "border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20"}`}>
            <CardContent className="py-4 px-5 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium flex items-center gap-1.5">
                  <span>{goalExceeded ? "⚠️" : "🎯"}</span>
                  Today's Goal Progress
                </span>
                <span className={`font-semibold ${goalExceeded ? "text-red-600" : "text-emerald-700"}`}>
                  {todayCo2.toFixed(2)} / {goal.toFixed(1)} kg CO₂
                </span>
              </div>
              <div className="w-full h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${goalExceeded ? "bg-red-500" : goalProgress >= 80 ? "bg-amber-500" : "bg-emerald-500"}`}
                  style={{ width: `${goalProgress}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{goalProgress.toFixed(0)}% used today</span>
                <span className={goalExceeded ? "text-red-500 font-medium" : "text-emerald-600"}>
                  {goalExceeded ? `${(todayCo2 - goal).toFixed(2)} kg over` : `${(goal - todayCo2).toFixed(2)} kg remaining`}
                </span>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Streak */}
      <motion.div variants={itemVariants}>
        <Card className="border border-orange-200 bg-orange-50 dark:bg-orange-950/20 dark:border-orange-900 shadow-sm">
          <CardContent className="py-3 px-5 flex items-center gap-4">
            <Flame className={`h-7 w-7 shrink-0 ${(streak?.currentStreak ?? 0) > 0 ? "text-orange-500" : "text-muted-foreground"}`} />
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold text-orange-600 dark:text-orange-400">{streak?.currentStreak ?? 0}</span>
              <span className="text-sm text-orange-700 dark:text-orange-300 font-medium">day streak</span>
            </div>
            <div className="h-5 w-px bg-orange-200 dark:bg-orange-800 mx-1" />
            <span className="text-xs text-orange-700/70">Best: <b>{streak?.longestStreak ?? 0}</b></span>
            <span className="text-xs text-orange-700/70">Total: <b>{streak?.totalDays ?? 0}</b> days</span>
            {(streak?.currentStreak ?? 0) === 0
              ? <span className="ml-auto text-xs text-muted-foreground italic">Log today to start your streak!</span>
              : <span className="ml-auto text-xs text-orange-600 font-medium">🔥 Keep it up!</span>
            }
          </CardContent>
        </Card>
      </motion.div>

      {/* Metric cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <motion.div variants={itemVariants}>
          <Card className="bg-gradient-to-br from-emerald-700 to-teal-800 text-white border-none shadow-md overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium opacity-90">Total Footprint</CardTitle>
              <Activity className="h-5 w-5 opacity-80" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{totalCo2.toFixed(1)} kg</div>
              <p className="text-xs opacity-70 mt-1">Total CO₂ logged</p>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div variants={itemVariants}>
          <Card className="shadow-md border border-border/60">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">Daily Average</CardTitle>
              <Globe className="h-5 w-5 text-teal-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dailyAverage.toFixed(1)} kg</div>
              <p className="text-xs text-muted-foreground mt-1">7-day period</p>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div variants={itemVariants}>
          <Card className="shadow-md border border-border/60">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">Tree Equivalent</CardTitle>
              <TreePine className="h-5 w-5 text-emerald-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{treeEquivalent.toFixed(1)}</div>
              <p className="text-xs text-muted-foreground mt-1">trees to absorb</p>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div variants={itemVariants}>
          <Card className="shadow-md border border-border/60">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">Flight Equivalent</CardTitle>
              <Plane className="h-5 w-5 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{flightHoursEquivalent.toFixed(1)} hr</div>
              <p className="text-xs text-muted-foreground mt-1">commercial flight</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Quick log + Quick actions */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Quick log form */}
        <motion.div variants={itemVariants}>
          <Card className="h-full shadow-md border-border/60 bg-card/90">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PlusCircle className="h-5 w-5 text-emerald-600" />
                Quick Log
              </CardTitle>
              <CardDescription>Enter values to record today's emissions.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <form onSubmit={handleAddRecord} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="transport" className="flex items-center gap-1.5 text-sm font-medium">
                    <Car className="h-4 w-4 text-emerald-600" /> Transport (km)
                  </Label>
                  <Input id="transport" type="number" step="any" placeholder="e.g. 15 km driven" value={transport}
                    onChange={(e) => setTransport(e.target.value)} disabled={submitting} className="focus-visible:ring-emerald-600" />
                  <p className="text-[10px] text-muted-foreground">0.21 kg CO₂/km</p>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="electricity" className="flex items-center gap-1.5 text-sm font-medium">
                    <Zap className="h-4 w-4 text-yellow-500" /> Electricity (kWh)
                  </Label>
                  <Input id="electricity" type="number" step="any" placeholder="e.g. 8 kWh used" value={electricity}
                    onChange={(e) => setElectricity(e.target.value)} disabled={submitting} className="focus-visible:ring-emerald-600" />
                  <p className="text-[10px] text-muted-foreground">0.233 kg CO₂/kWh</p>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="food" className="flex items-center gap-1.5 text-sm font-medium">
                    <Utensils className="h-4 w-4 text-orange-500" /> Food (meat meals)
                  </Label>
                  <Input id="food" type="number" step="1" placeholder="e.g. 2 meat meals" value={food}
                    onChange={(e) => setFood(e.target.value)} disabled={submitting} className="focus-visible:ring-emerald-600" />
                  <p className="text-[10px] text-muted-foreground">6.61 kg CO₂/meal</p>
                </div>
                <Button type="submit" className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-medium" disabled={submitting}>
                  {submitting ? "Logging…" : "Add Record"}
                </Button>
              </form>

              <div className="pt-4 border-t border-border/60">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Daily CO₂ Goal</p>
                <form onSubmit={handleSaveGoal} className="flex gap-2">
                  <Input type="number" step="any" min="0.1"
                    placeholder={goal !== null ? `Current: ${goal} kg` : "e.g. 5 kg"}
                    value={goalInput} onChange={(e) => setGoalInput(e.target.value)}
                    className="flex-1 focus-visible:ring-emerald-600 text-sm" disabled={savingGoal} />
                  <Button type="submit" size="sm" className="bg-emerald-700 hover:bg-emerald-800 text-white"
                    disabled={savingGoal || !goalInput}>
                    {savingGoal ? "…" : "Set"}
                  </Button>
                </form>
                {goal !== null && <p className="text-[10px] text-muted-foreground mt-1.5">Target: {goal} kg CO₂/day</p>}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Quick action links */}
        <motion.div variants={itemVariants} className="flex flex-col gap-4">
          <Link href="/log">
            <Card className="shadow-sm border-border/60 hover:shadow-md hover:border-emerald-300 transition-all cursor-pointer group">
              <CardContent className="py-5 px-5 flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center shrink-0">
                  <PlusCircle className="h-5 w-5 text-emerald-600" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-foreground">Log Detailed Activity</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Choose transport, food, energy or shopping</p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-emerald-600 transition-colors" />
              </CardContent>
            </Card>
          </Link>

          <Link href="/bank">
            <Card className="shadow-sm border-border/60 hover:shadow-md hover:border-blue-300 transition-all cursor-pointer group">
              <CardContent className="py-5 px-5 flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center shrink-0">
                  <CreditCard className="h-5 w-5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-foreground">Import Bank Transactions</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Auto-detect carbon from purchases</p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-blue-600 transition-colors" />
              </CardContent>
            </Card>
          </Link>

          <Link href="/insights">
            <Card className="shadow-sm border-border/60 hover:shadow-md hover:border-purple-300 transition-all cursor-pointer group">
              <CardContent className="py-5 px-5 flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center shrink-0">
                  <BarChart3 className="h-5 w-5 text-purple-600" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-foreground">View Insights & Heatmap</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Charts, trends and 90-day activity heatmap</p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-purple-600 transition-colors" />
              </CardContent>
            </Card>
          </Link>

          <Link href="/challenges">
            <Card className="shadow-sm border-border/60 hover:shadow-md hover:border-amber-300 transition-all cursor-pointer group">
              <CardContent className="py-5 px-5 flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center shrink-0">
                  <span className="text-xl">🏆</span>
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-foreground">Join a Challenge</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Compete and commit to eco-goals</p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-amber-600 transition-colors" />
              </CardContent>
            </Card>
          </Link>
        </motion.div>
      </div>
    </motion.div>
  );
}
