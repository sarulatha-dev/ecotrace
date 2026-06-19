import { useState, useEffect } from "react";
import { useSessionId } from "@/hooks/use-session";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";
import {
  TreePine,
  Plane,
  Globe,
  Activity,
  Trash2,
  PlusCircle,
  Car,
  Zap,
  Utensils,
  Flame
} from "lucide-react";
import {
  useListActivities,
  getListActivitiesQueryKey,
  useCreateActivity,
  useDeleteActivity,
  useGetActivitySummary,
  getGetActivitySummaryQueryKey,
  useGetActivityStreak,
  getGetActivityStreakQueryKey,
} from "@workspace/api-client-react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title as ChartTitle,
  Tooltip as ChartTooltip,
  Legend as ChartLegend,
  Filler,
  ScriptableContext
} from "chart.js";
import { Line } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ChartTitle,
  ChartTooltip,
  ChartLegend,
  Filler
);

export default function Dashboard() {
  const sessionId = useSessionId();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [transport, setTransport] = useState<string>("");
  const [electricity, setElectricity] = useState<string>("");
  const [food, setFood] = useState<string>("");
  const [submitting, setSubmitting] = useState<boolean>(false);

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

  const createActivity = useCreateActivity();
  const deleteActivity = useDeleteActivity();

  const summary = summaryQuery.data;
  const activities = activitiesQuery.data ?? [];
  const streak = streakQuery.data;
  const loading = summaryQuery.isLoading || activitiesQuery.isLoading;

  const totalCo2 = summary?.totalCo2 ?? 0;
  const dailyAverage = summary?.dailyAverage ?? 0;
  const treeEquivalent = summary?.treeEquivalent ?? 0;
  const flightHoursEquivalent = summary?.flightHoursEquivalent ?? 0;

  const handleAddRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionId) return;

    if (!transport && !electricity && !food) {
      toast({
        title: "Input error",
        description: "Please enter at least one value to calculate emissions.",
        variant: "destructive"
      });
      return;
    }

    try {
      setSubmitting(true);
      const promises: Promise<unknown>[] = [];

      if (transport && Number(transport) > 0) {
        promises.push(
          createActivity.mutateAsync({
            data: { sessionId, category: "transport", activityType: "car_km", value: Number(transport) }
          })
        );
      }
      if (electricity && Number(electricity) > 0) {
        promises.push(
          createActivity.mutateAsync({
            data: { sessionId, category: "energy", activityType: "electricity_kwh", value: Number(electricity) }
          })
        );
      }
      if (food && Number(food) > 0) {
        promises.push(
          createActivity.mutateAsync({
            data: { sessionId, category: "food", activityType: "beef_meal", value: Number(food) }
          })
        );
      }

      await Promise.all(promises);

      setTransport("");
      setElectricity("");
      setFood("");

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: getListActivitiesQueryKey({ sessionId }) }),
        queryClient.invalidateQueries({ queryKey: getGetActivitySummaryQueryKey({ sessionId, days: 7 }) }),
        queryClient.invalidateQueries({ queryKey: getGetActivityStreakQueryKey({ sessionId }) }),
      ]);

      toast({
        title: "Record logged",
        description: "Successfully logged emissions."
      });
    } catch (err) {
      console.error(err);
      toast({
        title: "Submission failed",
        description: "Could not log emission record to the database.",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteRecord = async (id: number) => {
    try {
      await deleteActivity.mutateAsync({ id });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: getListActivitiesQueryKey({ sessionId: sessionId! }) }),
        queryClient.invalidateQueries({ queryKey: getGetActivitySummaryQueryKey({ sessionId: sessionId!, days: 7 }) }),
        queryClient.invalidateQueries({ queryKey: getGetActivityStreakQueryKey({ sessionId: sessionId! }) }),
      ]);
      toast({
        title: "Record deleted",
        description: "The emission record was successfully deleted."
      });
    } catch (err) {
      console.error(err);
      toast({
        title: "Delete failed",
        description: "Failed to remove the emission record.",
        variant: "destructive"
      });
    }
  };

  const chartDataList = [...activities].reverse();

  const chartLabels = chartDataList.map((record) => {
    const d = new Date(record.loggedAt);
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit" });
  });

  const chartData = {
    labels: chartLabels.length > 0 ? chartLabels : ["No logs"],
    datasets: [
      {
        label: "Total Emissions (kg CO₂)",
        data: chartDataList.length > 0 ? chartDataList.map((r) => r.co2Amount) : [0],
        borderColor: "rgb(20, 110, 80)",
        backgroundColor: (context: ScriptableContext<"line">) => {
          const chart = context.chart;
          const { ctx, chartArea } = chart;
          if (!chartArea) return "rgba(20, 110, 80, 0.1)";
          const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
          gradient.addColorStop(0, "rgba(20, 110, 80, 0.4)");
          gradient.addColorStop(1, "rgba(20, 110, 80, 0.0)");
          return gradient;
        },
        fill: true,
        tension: 0.35,
        borderWidth: 3,
        pointBackgroundColor: "rgb(20, 110, 80)",
        pointHoverRadius: 7,
        pointHoverBackgroundColor: "#ff7a00"
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        padding: 12,
        backgroundColor: "rgba(10, 25, 20, 0.95)",
        titleFont: { size: 13, weight: "bold" as const },
        bodyFont: { size: 12 },
        callbacks: {
          label: (context: any) => `Emissions: ${context.raw.toFixed(2)} kg CO₂`
        }
      }
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: "rgba(120, 120, 120, 0.8)", font: { size: 10 } }
      },
      y: {
        grid: { color: "rgba(200, 200, 200, 0.15)" },
        ticks: { color: "rgba(120, 120, 120, 0.8)", font: { size: 10 } }
      }
    }
  };

  if (loading && activities.length === 0) {
    return (
      <div className="p-6 md:p-8 space-y-6 max-w-6xl mx-auto">
        <Skeleton className="h-10 w-48 mb-8" />
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          <Skeleton className="h-[400px] md:col-span-1" />
          <Skeleton className="h-[400px] md:col-span-2" />
        </div>
      </div>
    );
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <motion.div
      className="p-6 md:p-8 space-y-8 max-w-6xl mx-auto"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      <div className="flex justify-between items-center">
        <div>
          <motion.h1 variants={itemVariants} className="text-3xl font-bold tracking-tight text-foreground bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">
            EcoTrace Carbon Tracker
          </motion.h1>
          <motion.p variants={itemVariants} className="text-muted-foreground mt-1">
            Track and offset your carbon footprint using live data.
          </motion.p>
        </div>
      </div>

      <motion.div variants={itemVariants}>
        <Card className="border border-orange-200 bg-orange-50 dark:bg-orange-950/20 dark:border-orange-900 shadow-sm">
          <CardContent className="py-3 px-5 flex items-center gap-4">
            <Flame className={`h-7 w-7 flex-shrink-0 ${(streak?.currentStreak ?? 0) > 0 ? "text-orange-500" : "text-muted-foreground"}`} />
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold text-orange-600 dark:text-orange-400">{streak?.currentStreak ?? 0}</span>
              <span className="text-sm text-orange-700 dark:text-orange-300 font-medium">
                {(streak?.currentStreak ?? 0) === 1 ? "day streak" : "day streak"}
              </span>
            </div>
            <div className="h-5 w-px bg-orange-200 dark:bg-orange-800 mx-1" />
            <div className="text-xs text-orange-700/70 dark:text-orange-400/70">
              Best: <span className="font-semibold">{streak?.longestStreak ?? 0}</span>
            </div>
            <div className="text-xs text-orange-700/70 dark:text-orange-400/70">
              Total days logged: <span className="font-semibold">{streak?.totalDays ?? 0}</span>
            </div>
            {(streak?.currentStreak ?? 0) === 0 && (
              <span className="ml-auto text-xs text-muted-foreground italic">Log an activity today to start your streak!</span>
            )}
            {(streak?.currentStreak ?? 0) > 0 && (
              <span className="ml-auto text-xs text-orange-600 font-medium">🔥 Keep it up!</span>
            )}
          </CardContent>
        </Card>
      </motion.div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <motion.div variants={itemVariants}>
          <Card className="bg-gradient-to-br from-emerald-700 to-teal-800 text-white border-none shadow-md overflow-hidden relative">
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
          <Card className="shadow-md border border-border/60 hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">Daily Average</CardTitle>
              <Globe className="h-5 w-5 text-teal-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dailyAverage.toFixed(1)} kg</div>
              <p className="text-xs text-muted-foreground mt-1">based on a 7-day period</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="shadow-md border border-border/60 hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">Tree Equivalent</CardTitle>
              <TreePine className="h-5 w-5 text-emerald-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{treeEquivalent.toFixed(1)}</div>
              <p className="text-xs text-muted-foreground mt-1">trees required to absorb</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="shadow-md border border-border/60 hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">Flight Equivalent</CardTitle>
              <Plane className="h-5 w-5 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{flightHoursEquivalent.toFixed(1)} hr</div>
              <p className="text-xs text-muted-foreground mt-1">commercial flight time</p>
            </CardContent>
          </Card>
        </motion.div>

      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <motion.div variants={itemVariants} className="md:col-span-1">
          <Card className="h-full shadow-md border-border/60 backdrop-blur-md bg-card/90">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PlusCircle className="h-5 w-5 text-emerald-600" />
                Log Emissions
              </CardTitle>
              <CardDescription>Enter values in the categories below.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddRecord} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="transport" className="flex items-center gap-1.5 font-medium text-sm">
                    <Car className="h-4 w-4 text-emerald-600" />
                    Transport (km)
                  </Label>
                  <Input
                    id="transport"
                    type="number"
                    step="any"
                    placeholder="e.g. 15 km driven"
                    value={transport}
                    onChange={(e) => setTransport(e.target.value)}
                    className="w-full focus-visible:ring-emerald-600"
                    disabled={submitting}
                  />
                  <p className="text-[10px] text-muted-foreground">0.21 kg CO₂ per km</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="electricity" className="flex items-center gap-1.5 font-medium text-sm">
                    <Zap className="h-4 w-4 text-yellow-500" />
                    Electricity (kWh)
                  </Label>
                  <Input
                    id="electricity"
                    type="number"
                    step="any"
                    placeholder="e.g. 8 kWh used"
                    value={electricity}
                    onChange={(e) => setElectricity(e.target.value)}
                    className="w-full focus-visible:ring-emerald-600"
                    disabled={submitting}
                  />
                  <p className="text-[10px] text-muted-foreground">0.233 kg CO₂ per kWh</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="food" className="flex items-center gap-1.5 font-medium text-sm">
                    <Utensils className="h-4 w-4 text-orange-500" />
                    Food (meat/processed meals)
                  </Label>
                  <Input
                    id="food"
                    type="number"
                    step="1"
                    placeholder="e.g. 2 meat meals"
                    value={food}
                    onChange={(e) => setFood(e.target.value)}
                    className="w-full focus-visible:ring-emerald-600"
                    disabled={submitting}
                  />
                  <p className="text-[10px] text-muted-foreground">6.61 kg CO₂ per meal</p>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-medium shadow-md transition-colors"
                  disabled={submitting}
                >
                  {submitting ? "Logging..." : "Add Record"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants} className="md:col-span-2">
          <Card className="h-full shadow-md border-border/60">
            <CardHeader>
              <CardTitle>Emission Trends</CardTitle>
              <CardDescription>Live trend line plotting carbon output per log (hover to inspect values)</CardDescription>
            </CardHeader>
            <CardContent className="h-[320px] pb-6">
              <div className="w-full h-full">
                <Line data={chartData} options={chartOptions} />
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <motion.div variants={itemVariants}>
        <Card className="shadow-md border-border/60">
          <CardHeader>
            <CardTitle>Logged Records</CardTitle>
            <CardDescription>Complete list of emissions stored in your PostgreSQL database.</CardDescription>
          </CardHeader>
          <CardContent>
            {activities.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-sm border-2 border-dashed rounded-lg bg-muted/20">
                No logs recorded yet. Start by entering values in the form above!
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-muted-foreground">
                  <thead className="text-xs text-foreground uppercase border-b bg-muted/30">
                    <tr>
                      <th scope="col" className="px-4 py-3 font-semibold">Logged At</th>
                      <th scope="col" className="px-4 py-3 font-semibold">Category</th>
                      <th scope="col" className="px-4 py-3 font-semibold">Activity</th>
                      <th scope="col" className="px-4 py-3 font-semibold">Value</th>
                      <th scope="col" className="px-4 py-3 font-semibold">CO₂</th>
                      <th scope="col" className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activities.map((record) => (
                      <tr key={record.id} className="bg-background border-b hover:bg-muted/10 transition-colors">
                        <td className="px-4 py-3 text-foreground font-medium">
                          {new Date(record.loggedAt).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 capitalize">{record.category}</td>
                        <td className="px-4 py-3">{record.activityLabel}</td>
                        <td className="px-4 py-3">{record.value} {record.unit}</td>
                        <td className="px-4 py-3 font-semibold text-emerald-700 dark:text-emerald-500">
                          {record.co2Amount.toFixed(2)} kg
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-muted-foreground hover:text-destructive transition-colors"
                            onClick={() => handleDeleteRecord(record.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
