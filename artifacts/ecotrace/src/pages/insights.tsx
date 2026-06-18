import { useSessionId } from "@/hooks/use-session";
import { useGetActivitySummary, getGetActivitySummaryQueryKey, useListActivities, getListActivitiesQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CATEGORY_COLORS, CATEGORY_LABELS } from "@/lib/constants";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend, BarChart, Bar, XAxis, YAxis } from "recharts";
import { Lightbulb, Info } from "lucide-react";

export default function Insights() {
  const sessionId = useSessionId();

  const { data: summary, isLoading: summaryLoading } = useGetActivitySummary(
    { sessionId: sessionId!, days: 30 },
    { query: { enabled: !!sessionId, queryKey: getGetActivitySummaryQueryKey({ sessionId: sessionId!, days: 30 }) } }
  );

  const { data: activities, isLoading: activitiesLoading } = useListActivities(
    { sessionId: sessionId!, days: 30 },
    { query: { enabled: !!sessionId, queryKey: getListActivitiesQueryKey({ sessionId: sessionId!, days: 30 }) } }
  );

  if (!sessionId || summaryLoading || activitiesLoading) {
    return (
      <div className="p-6 md:p-8 space-y-6 max-w-5xl mx-auto">
        <Skeleton className="h-10 w-48 mb-8" />
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-[400px]" />
          <Skeleton className="h-[400px]" />
        </div>
      </div>
    );
  }

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  // Process category data for charts
  const categoryData = summary?.byCategory.map(c => ({
    name: CATEGORY_LABELS[c.category as keyof typeof CATEGORY_LABELS] || c.category,
    value: c.co2Amount,
    color: CATEGORY_COLORS[c.category as keyof typeof CATEGORY_COLORS]?.replace('text-', '') || 'gray-500' // rudimentary color extraction, fallback handled in render
  })) || [];

  // Generate tips based on highest emitting category
  const highestCategory = summary?.byCategory.length 
    ? summary.byCategory.reduce((prev, current) => (prev.co2Amount > current.co2Amount) ? prev : current)
    : null;

  const getTips = (cat: string | null) => {
    switch(cat) {
      case 'transport': return [
        "Try carpooling or taking public transit once a week.",
        "Ensure your tires are properly inflated to improve gas mileage.",
        "Combine errands into a single trip."
      ];
      case 'food': return [
        "Substitute one meat meal per week with a plant-based option.",
        "Buy local, seasonal produce to reduce transportation emissions.",
        "Plan meals carefully to reduce food waste."
      ];
      case 'energy': return [
        "Switch to LED bulbs throughout your home.",
        "Adjust your thermostat by 1-2 degrees (lower in winter, higher in summer).",
        "Unplug vampire appliances when not in use."
      ];
      case 'shopping': return [
        "Buy secondhand clothing or electronics when possible.",
        "Consolidate online orders to reduce shipping impact.",
        "Invest in high-quality items that last longer."
      ];
      default: return [
        "Log more activities to get personalized recommendations.",
        "Check out the Challenges page for ideas to reduce your footprint."
      ];
    }
  };

  const pieColors = ['hsl(var(--primary))', 'hsl(var(--accent))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))'];

  return (
    <motion.div 
      className="p-6 md:p-8 space-y-8 max-w-5xl mx-auto"
      variants={container}
      initial="hidden"
      animate="show"
    >
      <div>
        <motion.h1 variants={item} className="text-3xl font-bold tracking-tight text-foreground">
          Insights & Analytics
        </motion.h1>
        <motion.p variants={item} className="text-muted-foreground mt-1">
          Deep dive into your 30-day impact history.
        </motion.p>
      </div>

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
                This category makes up <span className="font-bold text-foreground">{Math.round(highestCategory.percentage)}%</span> of your recent carbon footprint. Here are a few personalized tips to help reduce it:
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

      <div className="grid gap-6 md:grid-cols-2">
        <motion.div variants={item}>
          <Card className="h-full shadow-sm">
            <CardHeader>
              <CardTitle>Emission Sources</CardTitle>
              <CardDescription>Breakdown by category</CardDescription>
            </CardHeader>
            <CardContent className="h-[300px]">
              {categoryData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={2}
                      dataKey="value"
                      stroke="none"
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={pieColors[index % pieColors.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip 
                      formatter={(value: number) => [`${value.toFixed(1)} kg CO₂`, 'Emissions']}
                      contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))' }}
                    />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground text-sm flex-col gap-2">
                  <Info className="h-5 w-5 opacity-50" />
                  No data available yet
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card className="h-full shadow-sm">
            <CardHeader>
              <CardTitle>Daily Averages</CardTitle>
              <CardDescription>Compare your impact to typical baselines</CardDescription>
            </CardHeader>
            <CardContent className="h-[300px] pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={[
                    { name: 'Your Avg', value: summary?.dailyAverage || 0, fill: 'hsl(var(--primary))' },
                    { name: 'Global Avg', value: summary?.globalAverage || 0, fill: 'hsl(var(--muted))' }
                  ]}
                  layout="vertical"
                  margin={{ top: 0, right: 30, left: 20, bottom: 0 }}
                  barSize={40}
                >
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fill: 'hsl(var(--foreground))', fontWeight: 500}} />
                  <RechartsTooltip 
                    cursor={{fill: 'transparent'}}
                    formatter={(value: number) => [`${value.toFixed(1)} kg`, 'Daily CO₂']}
                    contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))' }}
                  />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {
                      [0,1].map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={index === 0 ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))'} />
                      ))
                    }
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