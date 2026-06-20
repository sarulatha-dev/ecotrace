import { useState } from "react";
import { useSessionId } from "@/hooks/use-session";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import {
  Home, Wifi, Zap, Thermometer, Lightbulb, Plug, Droplets,
  CheckCircle2, Sparkles, TrendingDown, Coins, ShieldCheck,
  BarChart3, AlertCircle, Plus, Crown
} from "lucide-react";
import { Link } from "wouter";

const DEMO_DEVICE_TEMPLATES = [
  { deviceType: "AC", deviceBrand: "Daikin", deviceId: "AC001", deviceName: "Living Room AC", icon: Thermometer, color: "text-blue-500", saving: "0.15t CO₂/yr", action: "Auto-reduces 2°C when you leave" },
  { deviceType: "light", deviceBrand: "Philips Hue", deviceId: "LT001", deviceName: "Smart Lights", icon: Lightbulb, color: "text-yellow-500", saving: "0.05t CO₂/yr", action: "Auto-turns off when room is empty" },
  { deviceType: "plug", deviceBrand: "Tuya", deviceId: "PL001", deviceName: "Smart Plugs", icon: Plug, color: "text-purple-500", saving: "0.08t CO₂/yr", action: "Auto-cuts power to idle devices" },
  { deviceType: "tap", deviceBrand: "Kohler", deviceId: "TP001", deviceName: "Smart Tap", icon: Droplets, color: "text-cyan-500", saving: "0.04t CO₂/yr", action: "Auto-reduces flow, detects leaks" },
];

const container = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } };
const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } };

export default function SmartHome() {
  const sessionId = useSessionId();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const [optimizingId, setOptimizingId] = useState<number | null>(null);

  const { data: devices = [], isLoading: loadingDevices } = useQuery({
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
      toast({ title: "Device connected!", description: "1-tap done. Enable optimization to start saving." });
      setConnectingId(null);
    },
    onError: () => { setConnectingId(null); toast({ title: "Connection failed", variant: "destructive" }); },
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
      toast({ title: `+${data.coinsEarned} Eco Coins earned!`, description: "Auto-optimization is now active." });
      setOptimizingId(null);
    },
    onError: () => { setOptimizingId(null); toast({ title: "Failed", variant: "destructive" }); },
  });

  const subscribeMutation = useMutation({
    mutationFn: async () => {
      const r = await axios.post("/api/subscribe", { sessionId, bundleType: "eco_home_bundle" });
      return r.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscription", sessionId] });
      queryClient.invalidateQueries({ queryKey: ["devices", sessionId] });
      toast({ title: "🎉 Subscribed to Eco Home Bundle!", description: "All devices now auto-optimizing." });
    },
    onError: () => toast({ title: "Subscription failed", variant: "destructive" }),
  });

  const connectedTemplates = DEMO_DEVICE_TEMPLATES.filter(
    (tpl) => !devices.some((d) => d.deviceType === tpl.deviceType)
  );

  const totalPassiveCo2 = devices.reduce((s, d) => {
    const tpl = DEMO_DEVICE_TEMPLATES.find((t) => t.deviceType === d.deviceType);
    return s + (tpl ? parseFloat(tpl.saving) : 0);
  }, 0);

  return (
    <motion.div className="p-6 md:p-8 space-y-8 max-w-4xl mx-auto" variants={container} initial="hidden" animate="show">
      <div>
        <motion.h1 variants={item} className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Home className="h-7 w-7 text-primary" /> Your Auto-Eco Home
        </motion.h1>
        <motion.p variants={item} className="text-muted-foreground mt-1">
          Your home optimizes itself — zero effort required.
        </motion.p>
      </div>

      {/* Passive Savings Banner */}
      {(savings?.co2Kg ?? 0) > 0 && (
        <motion.div variants={item}>
          <div className="rounded-2xl bg-gradient-to-r from-primary/20 to-emerald-500/10 border border-primary/20 p-5 flex flex-col md:flex-row gap-4 md:items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest mb-1">Total Passive Savings</p>
              <p className="text-2xl font-bold text-primary">{savings?.co2Kg.toFixed(2)} kg CO₂ saved</p>
              <p className="text-sm text-muted-foreground mt-0.5">You did NOTHING 😎 — your home did it automatically</p>
            </div>
            <div className="flex gap-6 shrink-0">
              <div className="text-center">
                <p className="text-xl font-bold">₹{savings?.money.toFixed(0)}</p>
                <p className="text-xs text-muted-foreground">Money saved</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-bold">{savings?.energyKwh.toFixed(1)}</p>
                <p className="text-xs text-muted-foreground">kWh saved</p>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Connected Devices */}
      {devices.length > 0 && (
        <motion.div variants={item} className="space-y-3">
          <h2 className="font-semibold text-lg">Connected Devices</h2>
          <div className="grid gap-3">
            {devices.map((device) => {
              const tpl = DEMO_DEVICE_TEMPLATES.find((t) => t.deviceType === device.deviceType);
              const Icon = tpl?.icon ?? Plug;
              return (
                <Card key={device.id} className="shadow-sm">
                  <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-secondary shrink-0`}>
                      <Icon className={`h-5 w-5 ${tpl?.color ?? "text-primary"}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold">{device.deviceName}</p>
                        <Badge variant="outline" className="text-xs text-emerald-600 border-emerald-300 bg-emerald-50">
                          <CheckCircle2 className="h-3 w-3 mr-1" /> Connected
                        </Badge>
                        {device.optimizationEnabled && (
                          <Badge className="text-xs bg-primary/10 text-primary border-0">
                            <Sparkles className="h-3 w-3 mr-1" /> Auto-Optimizing
                          </Badge>
                        )}
                      </div>
                      {tpl && <p className="text-sm text-muted-foreground mt-0.5">{tpl.action} · Saving {tpl.saving}</p>}
                    </div>
                    {!device.optimizationEnabled && (
                      <Button
                        size="sm" variant="outline"
                        disabled={optimizingId === device.id}
                        onClick={() => { setOptimizingId(device.id); optimizeMutation.mutate(device.id); }}
                      >
                        <Sparkles className="h-3.5 w-3.5 mr-1" />
                        {optimizingId === device.id ? "Enabling…" : "Enable Auto-Opt"}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Connect More Devices */}
      {connectedTemplates.length > 0 && (
        <motion.div variants={item} className="space-y-3">
          <h2 className="font-semibold text-lg">
            {devices.length === 0 ? "1-Tap Setup — Connect Your Devices" : "Connect More Devices"}
          </h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {connectedTemplates.map((tpl) => {
              const Icon = tpl.icon;
              const isConnecting = connectingId === tpl.deviceId;
              return (
                <Card key={tpl.deviceId} className="shadow-sm border-dashed border-2 border-border/60">
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-secondary shrink-0">
                      <Icon className={`h-5 w-5 ${tpl.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium">{tpl.deviceName}</p>
                      <p className="text-xs text-muted-foreground">{tpl.deviceBrand} · {tpl.saving}</p>
                    </div>
                    <Button
                      size="sm"
                      disabled={isConnecting}
                      onClick={() => {
                        setConnectingId(tpl.deviceId);
                        connectMutation.mutate(tpl);
                      }}
                    >
                      {isConnecting ? <><Wifi className="h-3.5 w-3.5 mr-1 animate-pulse" />Connecting…</> : <><Plus className="h-3.5 w-3.5 mr-1" />Connect</>}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Total passive CO₂ */}
      {devices.length > 0 && totalPassiveCo2 > 0 && (
        <motion.div variants={item}>
          <div className="rounded-2xl bg-secondary/50 border border-border p-5 text-center space-y-1">
            <p className="text-muted-foreground text-sm">Annual passive CO₂ reduction potential</p>
            <p className="text-4xl font-bold text-primary">{totalPassiveCo2.toFixed(2)}t CO₂/year</p>
            <p className="text-sm text-muted-foreground">Your home is doing the work for you 🏠✨</p>
          </div>
        </motion.div>
      )}

      {/* Quick links */}
      <motion.div variants={item} className="grid sm:grid-cols-3 gap-3">
        <Link href="/rewards">
          <Card className="shadow-sm cursor-pointer hover:border-primary/40 transition-colors">
            <CardContent className="p-4 flex items-center gap-3">
              <Coins className="h-5 w-5 text-yellow-500" />
              <div>
                <p className="font-medium text-sm">Eco Rewards</p>
                <p className="text-xs text-muted-foreground">Coins & cashback</p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/bill-optimizer">
          <Card className="shadow-sm cursor-pointer hover:border-primary/40 transition-colors">
            <CardContent className="p-4 flex items-center gap-3">
              <TrendingDown className="h-5 w-5 text-blue-500" />
              <div>
                <p className="font-medium text-sm">Bill Optimizer</p>
                <p className="text-xs text-muted-foreground">Cut electricity bills</p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/insights">
          <Card className="shadow-sm cursor-pointer hover:border-primary/40 transition-colors">
            <CardContent className="p-4 flex items-center gap-3">
              <BarChart3 className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium text-sm">Insights</p>
                <p className="text-xs text-muted-foreground">View analytics</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </motion.div>

      {/* Eco Bundle CTA */}
      {!subStatus?.subscribed && (
        <motion.div variants={item}>
          <div className="rounded-2xl bg-gradient-to-br from-primary/10 to-emerald-600/5 border border-primary/20 p-6 flex flex-col md:flex-row gap-4 md:items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-yellow-500" />
                <p className="font-bold text-lg">Eco Home Bundle</p>
              </div>
              <p className="text-sm text-muted-foreground">
                AI-powered auto-optimization for all devices. Cancel anytime.
              </p>
              <ul className="text-sm text-muted-foreground space-y-0.5 mt-2">
                <li className="flex items-center gap-2"><ShieldCheck className="h-3.5 w-3.5 text-primary" /> AI habit learning for every device</li>
                <li className="flex items-center gap-2"><ShieldCheck className="h-3.5 w-3.5 text-primary" /> Auto-bill optimizer included</li>
                <li className="flex items-center gap-2"><ShieldCheck className="h-3.5 w-3.5 text-primary" /> 3× faster Eco Coin earning</li>
              </ul>
            </div>
            <div className="flex flex-col items-center gap-2 shrink-0">
              <p className="text-3xl font-bold">₹999<span className="text-base font-normal text-muted-foreground">/mo</span></p>
              <Button
                className="w-full md:w-auto"
                disabled={subscribeMutation.isPending}
                onClick={() => subscribeMutation.mutate()}
              >
                {subscribeMutation.isPending ? "Subscribing…" : "Subscribe Now"}
              </Button>
            </div>
          </div>
        </motion.div>
      )}

      {subStatus?.subscribed && (
        <motion.div variants={item}>
          <div className="rounded-2xl border border-emerald-300 bg-emerald-50 dark:bg-emerald-950/20 p-4 flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            <div>
              <p className="font-semibold text-emerald-700 dark:text-emerald-400">Eco Home Bundle Active</p>
              <p className="text-sm text-muted-foreground">AI is auto-optimizing all your devices 24/7.</p>
            </div>
            <Badge className="ml-auto bg-emerald-600 text-white">₹999/mo</Badge>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
