import { useState } from "react";
import { useSessionId } from "@/hooks/use-session";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import {
  Zap, Droplets, TrendingDown, CheckCircle2, AlertCircle,
  Clock, Leaf, DollarSign, BarChart2, Wifi
} from "lucide-react";

const container = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } };
const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } };

const BILL_OPTIMIZERS = [
  {
    id: "electricity",
    label: "Electricity Bill",
    icon: Zap,
    color: "text-yellow-500",
    bg: "bg-yellow-50 dark:bg-yellow-950/20",
    border: "border-yellow-200",
    description: "Connect your Smart Meter to auto-shift usage to off-peak hours and reduce your bill by up to 25%.",
    beforeCost: 800,
    afterCost: 600,
    co2Saving: "0.12t CO₂/year",
    unit: "₹/month",
    savings: "₹200/month",
    deviceType: "meter",
    features: [
      "Auto-shifts heavy loads (washing machine, EV charger) to 11pm–6am off-peak",
      "Detects and alerts vampire power drains",
      "Negotiates Time-of-Use tariff automatically",
      "Provides real-time consumption dashboard",
    ],
  },
  {
    id: "water",
    label: "Water Bill",
    icon: Droplets,
    color: "text-cyan-500",
    bg: "bg-cyan-50 dark:bg-cyan-950/20",
    border: "border-cyan-200",
    description: "Connect a Smart Tap controller to auto-reduce flow, detect leaks, and cut water waste by 30%.",
    beforeCost: 500,
    afterCost: 350,
    co2Saving: "0.05t CO₂/year",
    unit: "₹/month",
    savings: "₹150/month",
    deviceType: "tap",
    features: [
      "Auto-detects and alerts on leaks within 2 minutes",
      "Reduces flow pressure during non-peak usage",
      "Tracks daily usage vs. neighbourhood average",
      "Reminds about seasonal conservation goals",
    ],
  },
];

export default function BillOptimizer() {
  const sessionId = useSessionId();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [enabled, setEnabled] = useState<Record<string, boolean>>({});
  const [connecting, setConnecting] = useState<string | null>(null);

  const { data: devices = [] } = useQuery({
    queryKey: ["devices", sessionId],
    queryFn: async () => {
      const r = await axios.get(`/api/devices?sessionId=${sessionId}`);
      return r.data as Array<{ id: number; deviceType: string; optimizationEnabled: boolean }>;
    },
    enabled: !!sessionId,
  });

  const enableMutation = useMutation({
    mutationFn: async (optimizer: (typeof BILL_OPTIMIZERS)[0]) => {
      // Connect the device first
      const connectRes = await axios.post("/api/devices/connect", {
        sessionId,
        deviceType: optimizer.deviceType,
        deviceBrand: optimizer.id === "electricity" ? "Schneider" : "Kohler",
        deviceId: `${optimizer.deviceType}-${Date.now()}`,
        deviceName: `Smart ${optimizer.label} Controller`,
      });
      // Then enable optimization
      await axios.post("/api/devices/optimize", { sessionId, deviceId: connectRes.data.device.id });
      // Track a savings event
      const co2Kg = optimizer.id === "electricity" ? 0.12 : 0.05;
      const energyKwh = co2Kg / 0.233;
      await axios.post("/api/savings/track", {
        sessionId,
        deviceId: connectRes.data.device.id,
        optimizationType: "bill_optimize",
        energySavedKwh: energyKwh,
        co2SavedKg: co2Kg,
        moneySaved: optimizer.beforeCost - optimizer.afterCost,
      });
      return { optimizerId: optimizer.id };
    },
    onSuccess: (data) => {
      setEnabled((p) => ({ ...p, [data.optimizerId]: true }));
      setConnecting(null);
      queryClient.invalidateQueries({ queryKey: ["devices", sessionId] });
      queryClient.invalidateQueries({ queryKey: ["savings", sessionId] });
      queryClient.invalidateQueries({ queryKey: ["wallet", sessionId] });
      toast({ title: "Auto-Optimizer enabled!", description: "Savings will kick in immediately." });
    },
    onError: () => { setConnecting(null); toast({ title: "Failed", variant: "destructive" }); },
  });

  const totalMonthlySavings = BILL_OPTIMIZERS.reduce((s, o) => {
    const isActive = enabled[o.id] || devices.some((d) => d.deviceType === o.deviceType && d.optimizationEnabled);
    return s + (isActive ? (o.beforeCost - o.afterCost) : 0);
  }, 0);

  return (
    <motion.div className="p-6 md:p-8 space-y-8 max-w-3xl mx-auto" variants={container} initial="hidden" animate="show">
      <div>
        <motion.h1 variants={item} className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <TrendingDown className="h-7 w-7 text-primary" /> Auto Bill Optimizer
        </motion.h1>
        <motion.p variants={item} className="text-muted-foreground mt-1">
          Your bills automatically reduce themselves — no monthly effort.
        </motion.p>
      </div>

      {/* Total savings banner */}
      {totalMonthlySavings > 0 && (
        <motion.div variants={item}>
          <div className="rounded-2xl bg-gradient-to-r from-primary/20 to-emerald-500/10 border border-primary/20 p-5 flex items-center justify-between flex-wrap gap-3">
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest mb-1">Active Monthly Savings</p>
              <p className="text-3xl font-bold text-primary">₹{totalMonthlySavings}<span className="text-base font-normal text-muted-foreground">/month</span></p>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Leaf className="h-4 w-4 text-primary" />
              Zero manual effort required
            </div>
          </div>
        </motion.div>
      )}

      {/* Bill optimizer cards */}
      {BILL_OPTIMIZERS.map((opt) => {
        const Icon = opt.icon;
        const isActive = enabled[opt.id] || devices.some((d) => d.deviceType === opt.deviceType && d.optimizationEnabled);
        const isConnecting = connecting === opt.id;
        const savingAmount = opt.beforeCost - opt.afterCost;
        const pct = Math.round((savingAmount / opt.beforeCost) * 100);

        return (
          <motion.div key={opt.id} variants={item}>
            <Card className={`shadow-sm border-2 ${isActive ? opt.border : "border-border"} transition-colors`}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${opt.bg}`}>
                      <Icon className={`h-5 w-5 ${opt.color}`} />
                    </div>
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        {opt.label}
                        {isActive && (
                          <Badge className="bg-emerald-100 text-emerald-700 border-0 text-xs">
                            <CheckCircle2 className="h-3 w-3 mr-1" /> Active
                          </Badge>
                        )}
                      </CardTitle>
                      <CardDescription className="text-xs mt-0.5">{opt.co2Saving} passive carbon reduction</CardDescription>
                    </div>
                  </div>
                  {!isActive && (
                    <Button
                      size="sm"
                      disabled={isConnecting}
                      onClick={() => { setConnecting(opt.id); enableMutation.mutate(opt); }}
                    >
                      {isConnecting ? <><Wifi className="h-3.5 w-3.5 mr-1 animate-pulse" />Connecting…</> : "Enable Auto-Optimizer"}
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">{opt.description}</p>

                {/* Before / After */}
                <div className="flex items-center gap-4 p-3 rounded-xl bg-secondary/50">
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">Your current bill</p>
                    <p className="text-xl font-bold line-through text-red-500">₹{opt.beforeCost}</p>
                    <p className="text-xs text-muted-foreground">{opt.unit}</p>
                  </div>
                  <TrendingDown className="h-6 w-6 text-primary mx-2 shrink-0" />
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">After optimizer</p>
                    <p className="text-xl font-bold text-emerald-600">₹{opt.afterCost}</p>
                    <p className="text-xs text-muted-foreground">{opt.unit}</p>
                  </div>
                  <div className="ml-auto text-right">
                    <p className="text-2xl font-bold text-primary">-{pct}%</p>
                    <p className="text-xs text-muted-foreground">You save {opt.savings}</p>
                  </div>
                </div>

                {/* Features */}
                <ul className="space-y-1.5">
                  {opt.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </motion.div>
        );
      })}

      {/* How it works */}
      <motion.div variants={item}>
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">How Auto-Optimization Works</CardTitle>
          </CardHeader>
          <CardContent className="grid sm:grid-cols-3 gap-4 text-center">
            {[
              { step: "1", icon: Wifi, label: "Connect", desc: "1-tap pairing with your smart meter or device" },
              { step: "2", icon: BarChart2, label: "AI Learns", desc: "Analyses 14 days of usage patterns" },
              { step: "3", icon: TrendingDown, label: "Auto-saves", desc: "Continuously optimizes without interruption" },
            ].map((s) => {
              const SIcon = s.icon;
              return (
                <div key={s.step} className="space-y-2">
                  <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto font-bold text-lg">{s.step}</div>
                  <SIcon className="h-5 w-5 text-primary mx-auto" />
                  <p className="font-medium text-sm">{s.label}</p>
                  <p className="text-xs text-muted-foreground">{s.desc}</p>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
