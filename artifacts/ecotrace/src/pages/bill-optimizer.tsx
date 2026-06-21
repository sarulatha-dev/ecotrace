import { useState } from "react";
import { useSessionId } from "@/hooks/use-session";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import CountUp from "react-countup";
import { useTranslation } from "react-i18next";
import {
  Zap, Droplets, TrendingDown, CheckCircle2,
  Leaf, BarChart2, Wifi, ChevronRight, HelpCircle
} from "lucide-react";
import { cn } from "@/lib/utils";

const container = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 100, damping: 15 } } };

const BILL_OPTIMIZERS = [
  {
    id: "electricity",
    labelKey: "electricityBill",
    icon: Zap,
    color: "text-yellow-500",
    bg: "bg-yellow-500/10 dark:bg-yellow-500/20",
    border: "border-yellow-500/30",
    activeGlow: "shadow-[0_0_20px_rgba(234,179,8,0.12)]",
    beforeCost: 800,
    afterCost: 600,
    deviceType: "meter",
  },
  {
    id: "water",
    labelKey: "waterBill",
    icon: Droplets,
    color: "text-cyan-500",
    bg: "bg-cyan-500/10 dark:bg-cyan-500/20",
    border: "border-cyan-500/30",
    activeGlow: "shadow-[0_0_20px_rgba(6,182,212,0.12)]",
    beforeCost: 500,
    afterCost: 350,
    deviceType: "tap",
  },
];

export default function BillOptimizer() {
  const { t } = useTranslation();
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
        deviceName: `Smart ${optimizer.id === "electricity" ? "Electricity" : "Water"} Controller`,
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
      toast({ title: t("billOptimizer.toast.successTitle"), description: t("billOptimizer.toast.successDesc") });
    },
    onError: () => {
      setConnecting(null);
      toast({ title: t("billOptimizer.toast.fail"), variant: "destructive" });
    },
  });

  const totalMonthlySavings = BILL_OPTIMIZERS.reduce((s, o) => {
    const isActive = enabled[o.id] || devices.some((d) => d.deviceType === o.deviceType && d.optimizationEnabled);
    return s + (isActive ? (o.beforeCost - o.afterCost) : 0);
  }, 0);

  const featureIndexes = [0, 1, 2, 3];

  return (
    <motion.div className="saas-container max-w-3xl space-y-6" variants={container} initial="hidden" animate="show">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-[var(--eco-primary)]/10 dark:bg-[var(--eco-primary)]/20 flex items-center justify-center border border-[var(--eco-primary)]/20 shadow-[0_0_15px_rgba(22,163,74,0.1)]">
            <TrendingDown className="h-5 w-5 text-[var(--eco-primary)]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-foreground via-foreground to-emerald-600 dark:to-emerald-400 bg-clip-text text-transparent">
              {t("billOptimizer.title")}
            </h1>
            <p className="text-muted-foreground text-xs mt-0.5">
              {t("billOptimizer.desc")}
            </p>
          </div>
        </div>
      </div>

      {/* Active Monthly Savings Banner */}
      {totalMonthlySavings > 0 && (
        <motion.div variants={item}>
          <div className="relative overflow-hidden rounded-2xl border border-[var(--eco-primary)]/20 bg-gradient-to-r from-emerald-500/10 via-[var(--eco-primary)]/5 to-transparent p-5 shadow-md">
            <div className="absolute right-0 top-0 w-32 h-32 bg-[var(--eco-primary)]/10 rounded-full blur-2xl pointer-events-none" />

            <div className="flex items-center justify-between flex-wrap gap-4 relative z-10">
              <div className="space-y-0.5">
                <p className="text-[10px] text-[var(--eco-primary)] font-bold uppercase tracking-wider">{t("billOptimizer.activeMonthlySavings")}</p>
                <div className="text-2xl font-black text-foreground flex items-baseline">
                  <span className="text-[var(--eco-primary)]">₹</span>
                  <CountUp end={totalMonthlySavings} duration={1.2} />
                  <span className="text-xs font-semibold text-muted-foreground ml-1">/ month</span>
                </div>
              </div>
              <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 px-3 py-1 rounded-full text-xs font-bold shadow-sm">
                <Leaf className="h-4 w-4 text-[var(--eco-primary)]" />
                {t("billOptimizer.zeroEffort")}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Bill Optimizer Cards */}
      <div className="space-y-4">
        {BILL_OPTIMIZERS.map((opt) => {
          const Icon = opt.icon;
          const isActive = enabled[opt.id] || devices.some((d) => d.deviceType === opt.deviceType && d.optimizationEnabled);
          const isConnecting = connecting === opt.id;
          const savingAmount = opt.beforeCost - opt.afterCost;
          const pct = Math.round((savingAmount / opt.beforeCost) * 100);

          return (
            <motion.div key={opt.id} variants={item}>
              <Card className={cn(
                "saas-card relative overflow-hidden p-5 border transition-all duration-300",
                isActive ? `${opt.border} bg-[var(--bg-glass)] ${opt.activeGlow}` : "border-border/80"
              )}>
                {/* Background decorative glow for active items */}
                {isActive && (
                  <div className="absolute -right-24 -top-24 w-48 h-48 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
                )}

                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-4 relative z-10">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className={cn(
                      "w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border relative",
                      isActive ? "bg-emerald-500/10 border-emerald-500/25" : opt.bg
                    )}>
                      {isActive && (
                        <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </span>
                      )}
                      <Icon className={cn("h-5 w-5", isActive ? "text-[var(--eco-primary)]" : opt.color)} />
                    </div>

                    <div className="min-w-0 space-y-0.5">
                      <h3 className="font-bold text-base flex items-center gap-2 flex-wrap">
                        {t(`billOptimizer.${opt.labelKey}`)}
                        {isActive && (
                          <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25 text-[9px] font-bold px-2 py-0 rounded-full">
                            <CheckCircle2 className="h-3 w-3 mr-1 inline-block" /> {t("billOptimizer.active")}
                          </Badge>
                        )}
                      </h3>
                      <p className="text-[11px] text-muted-foreground font-medium">
                        {t(`billOptimizer.optimizers.${opt.id}.saving`)} {t("billOptimizer.passiveCarbonReduction")}
                      </p>
                    </div>
                  </div>

                  {!isActive && (
                    <Button
                      size="sm"
                      className="interactive h-8 text-[11px] font-bold px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-[var(--eco-primary)] hover:from-emerald-600 hover:to-[var(--eco-best)] text-white shadow-sm shrink-0"
                      disabled={isConnecting}
                      onClick={() => { setConnecting(opt.id); enableMutation.mutate(opt); }}
                    >
                      {isConnecting ? (
                        <>
                          <Wifi className="h-3 w-3 mr-1.5 animate-pulse" />
                          {t("billOptimizer.connecting")}
                        </>
                      ) : (
                        t("billOptimizer.enableAutoOpt")
                      )}
                    </Button>
                  )}
                </div>

                <div className="space-y-4 relative z-10">
                  <p className="text-xs text-muted-foreground leading-relaxed pl-1 font-medium">
                    {t(`billOptimizer.optimizers.${opt.id}.description`)}
                  </p>

                  {/* Before / After Dashboard Layout */}
                  <div className="grid grid-cols-3 gap-2 p-3 rounded-2xl bg-muted/40 dark:bg-muted/5 border border-border/40 backdrop-blur-sm items-center">
                    <div className="text-center">
                      <p className="text-[9px] text-muted-foreground font-bold tracking-wider uppercase">{t("billOptimizer.currentBill")}</p>
                      <p className="text-base font-extrabold line-through text-red-500/90 leading-tight">₹{opt.beforeCost}</p>
                      <p className="text-[9px] text-muted-foreground leading-none mt-0.5">{t(`billOptimizer.optimizers.${opt.id}.unit`)}</p>
                    </div>

                    <div className="flex flex-col items-center justify-center shrink-0">
                      <TrendingDown className="h-5 w-5 text-[var(--eco-primary)] animate-bounce" style={{ animationDuration: "2s" }} />
                      <span className="text-[9px] font-bold text-[var(--eco-primary)] uppercase tracking-wider mt-0.5">-{pct}%</span>
                    </div>

                    <div className="text-center">
                      <p className="text-[9px] text-muted-foreground font-bold tracking-wider uppercase">{t("billOptimizer.afterOpt")}</p>
                      <p className="text-base font-extrabold text-emerald-600 dark:text-emerald-400 leading-tight">₹{opt.afterCost}</p>
                      <p className="text-[9px] text-muted-foreground leading-none mt-0.5">{t(`billOptimizer.optimizers.${opt.id}.unit`)}</p>
                    </div>
                  </div>

                  {/* Before/After Progress bar */}
                  <div className="space-y-1.5 px-1">
                    <div className="flex justify-between items-center text-[10px] text-muted-foreground font-semibold">
                      <span>Standard Cost</span>
                      <span className="text-[var(--eco-primary)]">Eco-Optimized (-₹{savingAmount})</span>
                    </div>
                    <div className="h-2 w-full bg-muted dark:bg-muted/10 rounded-full overflow-hidden flex">
                      <div className="h-full bg-red-500/30 dark:bg-red-500/15" style={{ width: `${100 - pct}%` }} />
                      <div className="h-full bg-gradient-to-r from-emerald-500 to-[var(--eco-primary)]" style={{ width: `${pct}%` }} />
                    </div>
                  </div>

                  {/* Features Checklist */}
                  <div className="border-t border-border/40 pt-3">
                    <ul className="grid sm:grid-cols-2 gap-x-4 gap-y-1.5 pl-1">
                      {featureIndexes.map((idx) => {
                        const featureText = t(`billOptimizer.optimizers.${opt.id}.features.${idx}`);
                        if (!featureText) return null;
                        return (
                          <li key={idx} className="flex items-start gap-2 text-[11px] text-muted-foreground leading-snug">
                            <CheckCircle2 className="h-3.5 w-3.5 text-[var(--eco-primary)] mt-0.5 shrink-0" />
                            <span className="font-medium">{featureText}</span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </div>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* How it Works Flowchart */}
      <motion.div variants={item}>
        <Card className="saas-card p-5 border border-border/80 shadow-[var(--shadow-soft)]">
          <h3 className="font-bold text-sm tracking-wide uppercase text-muted-foreground mb-4 pl-1">{t("billOptimizer.howItWorks")}</h3>
          <div className="relative grid sm:grid-cols-3 gap-6 text-center">
            {/* Dashed connector line for desktop */}
            <div className="hidden sm:block absolute top-7 left-[16%] right-[16%] h-0.5 border-t border-dashed border-border/60 z-0 pointer-events-none" />

            {[
              { step: "1", icon: Wifi, labelKey: "billOptimizer.steps.1.label", descKey: "billOptimizer.steps.1.desc" },
              { step: "2", icon: BarChart2, labelKey: "billOptimizer.steps.2.label", descKey: "billOptimizer.steps.2.desc" },
              { step: "3", icon: TrendingDown, labelKey: "billOptimizer.steps.3.label", descKey: "billOptimizer.steps.3.desc" },
            ].map((s) => {
              const SIcon = s.icon;
              return (
                <div key={s.step} className="space-y-2 relative z-10 group">
                  <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[var(--eco-primary)] flex items-center justify-center mx-auto font-black text-sm shadow-sm group-hover:scale-105 transition-transform duration-300">
                    {s.step}
                  </div>
                  <SIcon className="h-4 w-4 text-[var(--eco-primary)] mx-auto animate-pulse" />
                  <p className="font-bold text-xs text-foreground">{t(s.labelKey)}</p>
                  <p className="text-[10px] text-muted-foreground leading-relaxed max-w-[180px] mx-auto font-medium">{t(s.descKey)}</p>
                </div>
              );
            })}
          </div>
        </Card>
      </motion.div>
    </motion.div>
  );
}
