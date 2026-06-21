import { useState } from "react";
import { useSessionId } from "@/hooks/use-session";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import CountUp from "react-countup";
import {
  Home, Wifi, Zap, Thermometer, Lightbulb, Plug, Droplets,
  CheckCircle2, Sparkles, TrendingDown, Coins, ShieldCheck,
  BarChart3, Plus, Crown, ChevronRight, HelpCircle
} from "lucide-react";
import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

const DEMO_DEVICE_TEMPLATES = [
  { deviceType: "AC", deviceBrand: "Daikin", deviceId: "AC001", deviceName: "Living Room AC", icon: Thermometer, color: "text-sky-500", saving: "0.15t CO₂/yr", action: "Auto-reduces 2°C when you leave" },
  { deviceType: "light", deviceBrand: "Philips Hue", deviceId: "LT001", deviceName: "Smart Lights", icon: Lightbulb, color: "text-amber-500", saving: "0.05t CO₂/yr", action: "Auto-turns off when room is empty" },
  { deviceType: "plug", deviceBrand: "Tuya", deviceId: "PL001", deviceName: "Smart Plugs", icon: Plug, color: "text-purple-500", saving: "0.08t CO₂/yr", action: "Auto-cuts power to idle devices" },
  { deviceType: "tap", deviceBrand: "Kohler", deviceId: "TP001", deviceName: "Smart Tap", icon: Droplets, color: "text-cyan-500", saving: "0.04t CO₂/yr", action: "Auto-reduces flow, detects leaks" },
];

const container = { hidden: {}, show: { transition: { staggerChildren: 0.05 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 100, damping: 15 } } };

export default function SmartHome() {
  const { t } = useTranslation();
  const sessionId = useSessionId();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const [optimizingId, setOptimizingId] = useState<number | null>(null);

  const { data: devices = [] } = useQuery({
    queryKey: ["devices", sessionId],
    queryFn: async () => {
      const r = await axios.get(`/api/devices?sessionId=${sessionId}`);
      return r.data as Array<{ id: number; deviceType: string; deviceBrand: string; deviceId: string; deviceName: string; isConnected: boolean; optimizationEnabled: boolean }>;
    },
    enabled: !!sessionId,
  });

  const { data: savings } = useQuery({
    queryKey: ["savings", sessionId],
    queryFn: async () => {
      const r = await axios.get(`/api/savings?sessionId=${sessionId}`);
      return r.data as { co2Kg: number; money: number; energyKwh: number };
    },
    enabled: !!sessionId,
  });

  const { data: subStatus } = useQuery({
    queryKey: ["subscription", sessionId],
    queryFn: async () => {
      const r = await axios.get(`/api/subscription/status?sessionId=${sessionId}`);
      return r.data as { subscribed: boolean };
    },
    enabled: !!sessionId,
  });

  const connectMutation = useMutation({
    mutationFn: async (tpl: (typeof DEMO_DEVICE_TEMPLATES)[0]) => {
      const r = await axios.post("/api/devices/connect", {
        sessionId, deviceType: tpl.deviceType, deviceBrand: tpl.deviceBrand,
        deviceId: tpl.deviceId + "-" + Date.now(), deviceName: tpl.deviceName,
      });
      return r.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["devices", sessionId] });
      toast({ title: t("smartHome.toast.connectedTitle"), description: t("smartHome.toast.connectedDesc") });
      setConnectingId(null);
    },
    onError: () => { setConnectingId(null); toast({ title: t("smartHome.toast.connectFailed"), variant: "destructive" }); },
  });

  const optimizeMutation = useMutation({
    mutationFn: async (deviceId: number) => {
      const r = await axios.post("/api/devices/optimize", { sessionId, deviceId });
      return r.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["devices", sessionId] });
      queryClient.invalidateQueries({ queryKey: ["savings", sessionId] });
      queryClient.invalidateQueries({ queryKey: ["wallet", sessionId] });
      toast({ title: t("smartHome.toast.optSuccessTitle", { coins: data.coinsEarned }), description: t("smartHome.toast.optSuccessDesc") });
      setOptimizingId(null);
    },
    onError: () => { setOptimizingId(null); toast({ title: t("smartHome.toast.optFailed"), variant: "destructive" }); },
  });

  const subscribeMutation = useMutation({
    mutationFn: async () => {
      const r = await axios.post("/api/subscribe", { sessionId, bundleType: "eco_home_bundle" });
      return r.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscription", sessionId] });
      queryClient.invalidateQueries({ queryKey: ["devices", sessionId] });
      toast({ title: t("smartHome.toast.subSuccessTitle"), description: t("smartHome.toast.subSuccessDesc") });
    },
    onError: () => toast({ title: t("smartHome.toast.subFailed"), variant: "destructive" }),
  });

  const connectedTemplates = DEMO_DEVICE_TEMPLATES.filter(
    (tpl) => !devices.some((d) => d.deviceType === tpl.deviceType)
  );

  const totalPassiveCo2 = devices.reduce((s, d) => {
    const tpl = DEMO_DEVICE_TEMPLATES.find((t) => t.deviceType === d.deviceType);
    return s + (tpl ? parseFloat(tpl.saving) : 0);
  }, 0);

  return (
    <motion.div className="p-4 md:p-6 space-y-6 max-w-4xl mx-auto" variants={container} initial="hidden" animate="show">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-[var(--eco-primary)]/10 dark:bg-[var(--eco-primary)]/20 flex items-center justify-center border border-[var(--eco-primary)]/20 shadow-[0_0_15px_rgba(22,163,74,0.1)]">
            <Home className="h-5 w-5 text-[var(--eco-primary)]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-foreground via-foreground to-emerald-600 dark:to-emerald-400 bg-clip-text text-transparent">
              {t("smartHome.title")}
            </h1>
            <p className="text-muted-foreground text-xs mt-0.5">
              {t("smartHome.desc")}
            </p>
          </div>
        </div>
      </div>

      {/* Passive Savings Banner - Premium eco mesh gradient card */}
      {(savings?.co2Kg ?? 0) > 0 && (
        <motion.div variants={item} className="relative overflow-hidden rounded-2xl border border-[var(--eco-primary)]/20 bg-gradient-to-r from-emerald-500/10 via-[var(--eco-primary)]/5 to-transparent p-6 shadow-md">
          {/* Neon mesh glows */}
          <div className="absolute right-0 top-0 w-36 h-36 bg-[var(--eco-primary)]/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute left-1/3 bottom-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />

          <div className="flex flex-col md:flex-row gap-6 md:items-center justify-between relative z-10">
            <div className="space-y-1">
              <p className="text-[10px] text-[var(--eco-primary)] font-bold uppercase tracking-widest">{t("smartHome.totalPassiveSavings")}</p>
              <div className="text-2xl font-extrabold tracking-tight text-foreground flex items-baseline gap-1.5">
                <span className="text-[var(--eco-primary)]">
                  <CountUp end={savings?.co2Kg ?? 0} decimals={2} duration={1.5} />
                </span>
                <span className="text-sm font-semibold text-muted-foreground">kg CO₂ saved</span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{t("smartHome.didNothing")}</p>
            </div>

            <div className="flex gap-8 border-t border-border/40 md:border-t-0 pt-4 md:pt-0 shrink-0">
              <div className="space-y-0.5">
                <span className="text-[9px] text-muted-foreground font-semibold uppercase tracking-wider block">{t("smartHome.moneySaved")}</span>
                <div className="text-xl font-bold flex items-baseline">
                  <span className="text-foreground">₹</span>
                  <CountUp end={savings?.money ?? 0} decimals={0} duration={1.2} />
                </div>
              </div>
              <div className="space-y-0.5">
                <span className="text-[9px] text-muted-foreground font-semibold uppercase tracking-wider block">{t("smartHome.kwhSaved")}</span>
                <div className="text-xl font-bold flex items-baseline">
                  <CountUp end={savings?.energyKwh ?? 0} decimals={1} duration={1.2} />
                  <span className="text-xs font-semibold text-muted-foreground ml-1">kWh</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Connected Devices Grid */}
      {devices.length > 0 && (
        <motion.div variants={item} className="space-y-3">
          <h2 className="font-bold text-sm tracking-wide uppercase text-muted-foreground pl-1">{t("smartHome.connectedDevices")}</h2>
          <div className="grid gap-3">
            {devices.map((device) => {
              const tpl = DEMO_DEVICE_TEMPLATES.find((t) => t.deviceType === device.deviceType);
              const Icon = tpl?.icon ?? Plug;
              const name = t(`smartHome.templates.${device.deviceType}.name`) || device.deviceName;
              const action = t(`smartHome.templates.${device.deviceType}.action`) || tpl?.action;
              const saving = t(`smartHome.templates.${device.deviceType}.saving`) || tpl?.saving;

              return (
                <div key={device.id} className="saas-card relative p-4 overflow-hidden border border-border/80 shadow-[var(--shadow-soft)]">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
                    <div className="flex items-center gap-3.5 min-w-0">
                      {/* Device Icon with dynamic status ring */}
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border relative",
                        device.optimizationEnabled
                          ? "bg-emerald-500/10 border-emerald-500/35 shadow-[0_0_12px_rgba(16,185,129,0.15)]"
                          : "bg-amber-500/10 border-amber-500/35"
                      )}>
                        {/* Pulse circle for active mode */}
                        {device.optimizationEnabled && (
                          <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                          </span>
                        )}
                        <Icon className={cn("h-5 w-5", tpl?.color || "text-[var(--eco-primary)]")} />
                      </div>

                      <div className="min-w-0 space-y-0.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-bold text-xs text-foreground">{name}</p>
                          <Badge variant="outline" className="text-[9px] font-bold px-2 py-0 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 rounded-full">
                            <CheckCircle2 className="h-2.5 w-2.5 mr-0.5 shrink-0" /> {t("smartHome.connectedBadge")}
                          </Badge>
                          {device.optimizationEnabled && (
                            <Badge className="text-[9px] font-bold px-2 py-0 bg-[var(--eco-primary)]/10 text-[var(--eco-primary)] border border-[var(--eco-primary)]/20 rounded-full">
                              <Sparkles className="h-2.5 w-2.5 mr-0.5 shrink-0 text-[var(--eco-primary)] animate-pulse" /> {t("smartHome.autoOptimizingBadge")}
                            </Badge>
                          )}
                        </div>
                        {tpl && <p className="text-[10px] text-muted-foreground font-medium">{action} · Saving {saving}</p>}
                      </div>
                    </div>

                    {!device.optimizationEnabled && (
                      <Button
                        size="sm"
                        className="interactive h-8 text-[10px] font-bold px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-[var(--eco-primary)] hover:from-emerald-600 hover:to-[var(--eco-best)] text-white shadow-sm"
                        disabled={optimizingId === device.id}
                        onClick={() => { setOptimizingId(device.id); optimizeMutation.mutate(device.id); }}
                      >
                        <Sparkles className="h-3 w-3 mr-1.5 shrink-0" />
                        {optimizingId === device.id ? t("smartHome.enabling") : t("smartHome.enableAutoOpt")}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Connect More Devices Section */}
      {connectedTemplates.length > 0 && (
        <motion.div variants={item} className="space-y-3">
          <h2 className="font-bold text-sm tracking-wide uppercase text-muted-foreground pl-1">
            {devices.length === 0 ? t("smartHome.setupTitle") : t("smartHome.connectMore")}
          </h2>
          <div className="grid sm:grid-cols-2 gap-3.5">
            {connectedTemplates.map((tpl) => {
              const Icon = tpl.icon;
              const isConnecting = connectingId === tpl.deviceId;
              const name = t(`smartHome.templates.${tpl.deviceType}.name`) || tpl.deviceName;
              const saving = t(`smartHome.templates.${tpl.deviceType}.saving`) || tpl.saving;

              return (
                <div key={tpl.deviceId} className="saas-card relative overflow-hidden group hover:border-[var(--eco-primary)]/40 hover:scale-[1.015] border border-dashed border-border/80 bg-white/20 dark:bg-muted/5 p-4 flex flex-col justify-between h-full">
                  <div className="flex items-center gap-3.5 mb-4">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-muted dark:bg-muted/10 border border-border/50 shrink-0">
                      <Icon className={cn("h-4.5 w-4.5 group-hover:scale-110 transition-transform duration-300", tpl.color)} />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-xs text-foreground truncate">{name}</p>
                      <p className="text-[10px] text-muted-foreground font-medium">{tpl.deviceBrand} · {saving}</p>
                    </div>
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full h-8 text-[10px] font-bold rounded-xl border-border/80 hover:bg-emerald-500/10 hover:text-[var(--eco-primary)] hover:border-[var(--eco-primary)]/30"
                    disabled={isConnecting}
                    onClick={() => {
                      setConnectingId(tpl.deviceId);
                      connectMutation.mutate(tpl);
                    }}
                  >
                    {isConnecting ? (
                      <>
                        <Wifi className="h-3 w-3 mr-1.5 animate-pulse" />
                        {t("smartHome.connecting")}
                      </>
                    ) : (
                      <>
                        <Plus className="h-3 w-3 mr-1" />
                        {t("smartHome.connect")}
                      </>
                    )}
                  </Button>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Annual Potential Savings info */}
      {devices.length > 0 && totalPassiveCo2 > 0 && (
        <motion.div variants={item}>
          <div className="rounded-2xl border border-border bg-muted/20 dark:bg-muted/5 p-4 text-center space-y-1 backdrop-blur-sm">
            <p className="text-muted-foreground text-xs font-semibold">{t("smartHome.annualPotential")}</p>
            <p className="text-xl font-extrabold text-[var(--eco-primary)]">{t("smartHome.annualPotentialVal", { co2: totalPassiveCo2.toFixed(2) })}</p>
            <p className="text-[10px] text-muted-foreground font-medium">{t("smartHome.doingWork")}</p>
          </div>
        </motion.div>
      )}

      {/* Quick Links Grid */}
      <motion.div variants={item} className="grid sm:grid-cols-3 gap-3">
        <Link href="/rewards">
          <div className="saas-card cursor-pointer group hover:border-[var(--eco-primary)]/30 hover:shadow-md transition-all duration-300 p-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center border border-amber-500/20 shrink-0">
                <Coins className="h-4 w-4 text-amber-500 group-hover:scale-110 transition-transform duration-300" />
              </div>
              <div className="min-w-0">
                <p className="font-bold text-xs text-foreground truncate">{t("smartHome.quickLinks.rewards")}</p>
                <p className="text-[10px] text-muted-foreground font-medium truncate">{t("smartHome.quickLinks.rewardsSub")}</p>
              </div>
            </div>
          </div>
        </Link>
        <Link href="/bill-optimizer">
          <div className="saas-card cursor-pointer group hover:border-[var(--eco-primary)]/30 hover:shadow-md transition-all duration-300 p-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-sky-500/10 flex items-center justify-center border border-sky-500/20 shrink-0">
                <TrendingDown className="h-4 w-4 text-sky-500 group-hover:scale-110 transition-transform duration-300" />
              </div>
              <div className="min-w-0">
                <p className="font-bold text-xs text-foreground truncate">{t("smartHome.quickLinks.bill")}</p>
                <p className="text-[10px] text-muted-foreground font-medium truncate">{t("smartHome.quickLinks.billSub")}</p>
              </div>
            </div>
          </div>
        </Link>
        <Link href="/insights">
          <div className="saas-card cursor-pointer group hover:border-[var(--eco-primary)]/30 hover:shadow-md transition-all duration-300 p-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 shrink-0">
                <BarChart3 className="h-4 w-4 text-emerald-500 group-hover:scale-110 transition-transform duration-300" />
              </div>
              <div className="min-w-0">
                <p className="font-bold text-xs text-foreground truncate">{t("smartHome.quickLinks.insights")}</p>
                <p className="text-[10px] text-muted-foreground font-medium truncate">{t("smartHome.quickLinks.insightsSub")}</p>
              </div>
            </div>
          </div>
        </Link>
      </motion.div>

      {/* Premium Eco Bundle CTA */}
      {!subStatus?.subscribed && (
        <motion.div variants={item}>
          <div className="relative overflow-hidden rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-[var(--eco-primary)]/5 to-transparent p-6 shadow-lg">
            {/* Shimmer background gradient */}
            <div className="absolute right-0 bottom-0 w-48 h-48 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -left-12 -top-12 w-32 h-32 bg-[var(--eco-primary)]/10 rounded-full blur-2xl pointer-events-none animate-pulse" />

            <div className="flex flex-col md:flex-row gap-6 md:items-center justify-between relative z-10">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-amber-500/15 flex items-center justify-center border border-amber-500/25">
                    <Crown className="h-4 w-4 text-amber-500 animate-bounce" style={{ animationDuration: "3s" }} />
                  </div>
                  <p className="font-extrabold text-base text-foreground tracking-tight">{t("smartHome.bundle.title")}</p>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed max-w-xl">
                  {t("smartHome.bundle.desc")}
                </p>
                <div className="grid sm:grid-cols-2 gap-x-6 gap-y-1.5 pt-2">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <ShieldCheck className="h-4 w-4 text-[var(--eco-primary)] shrink-0" />
                    <span className="font-medium">{t("smartHome.bundle.feature1")}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <ShieldCheck className="h-4 w-4 text-[var(--eco-primary)] shrink-0" />
                    <span className="font-medium">{t("smartHome.bundle.feature2")}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <ShieldCheck className="h-4 w-4 text-[var(--eco-primary)] shrink-0" />
                    <span className="font-medium">{t("smartHome.bundle.feature3")}</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-center gap-2.5 shrink-0 bg-white/40 dark:bg-black/25 backdrop-blur-sm border border-border/40 p-5 rounded-2xl min-w-[160px] text-center shadow-inner">
                <div className="space-y-0.5">
                  <p className="text-xs text-muted-foreground font-bold tracking-wider uppercase">Eco Bundle</p>
                  <p className="text-2xl font-black text-foreground">{t("smartHome.bundle.pricePerMo", { price: "999" })}</p>
                </div>
                <Button
                  size="default"
                  className="interactive w-full h-9 text-xs font-bold rounded-xl bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-white shadow-md"
                  disabled={subscribeMutation.isPending}
                  onClick={() => subscribeMutation.mutate()}
                >
                  {subscribeMutation.isPending ? t("smartHome.bundle.subscribing") : t("smartHome.bundle.subscribe")}
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Active Subscription Badge/Panel */}
      {subStatus?.subscribed && (
        <motion.div variants={item}>
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 dark:bg-emerald-500/5 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm relative overflow-hidden">
            <div className="absolute right-0 bottom-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
            <div className="flex items-center gap-3 relative z-10">
              <div className="h-9 w-9 rounded-xl bg-emerald-500/15 flex items-center justify-center border border-emerald-500/25">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              </div>
              <div>
                <p className="font-bold text-xs text-emerald-700 dark:text-emerald-400">{t("smartHome.bundle.activeTitle")}</p>
                <p className="text-[10px] text-muted-foreground font-medium mt-0.5">{t("smartHome.bundle.activeDesc")}</p>
              </div>
            </div>
            <Badge className="sm:ml-auto bg-emerald-600 text-white text-[9px] font-bold px-3 py-1 border-0 shadow-sm rounded-full shrink-0 relative z-10">
              {t("smartHome.bundle.pricePerMo", { price: "999" })}
            </Badge>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
