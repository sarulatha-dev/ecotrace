import { useState } from "react";
import { useSessionId } from "@/hooks/use-session";
import { useLogState } from "@/hooks/use-log-state";
import { useCreateActivity, getGetActivitySummaryQueryKey, getListActivitiesQueryKey, getGetActivityStreakQueryKey } from "@workspace/api-client-react";
import { CATEGORY_LABELS, ACTIVITY_TYPES } from "@/lib/constants";
import { ActivityCategory } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion, AnimatePresence } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import {
  Loader2, CheckCircle2, ArrowRight, RotateCcw, BarChart3,
  Car, Utensils, Zap, ShoppingBag, Shield, Bell, History,
  Plane, Trees, Check, Leaf
} from "lucide-react";
import { cn } from "@/lib/utils";
import CountUp from "react-countup";

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

const CATEGORY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  transport: Car,
  food: Utensils,
  energy: Zap,
  shopping: ShoppingBag,
};

const CATEGORY_EMOJIS: Record<string, string> = {
  transport: "🚗",
  food: "🍲",
  energy: "⚡",
  shopping: "🛍",
};

const CATEGORY_CONFIG: Record<string, {
  iconBg: string;
  iconColor: string;
  borderSelected: string;
  bgSelected: string;
  checkColor: string;
  label: string;
  description: string;
}> = {
  transport: {
    iconBg: "bg-[#DCFCE7]",
    iconColor: "text-[#16A34A]",
    borderSelected: "border-[#22C55E]",
    bgSelected: "bg-[#F0FDF4]",
    checkColor: "bg-[#16A34A]",
    label: "Transport",
    description: "Cars, bikes, flights, public transport",
  },
  food: {
    iconBg: "bg-[#FEF3C7]",
    iconColor: "text-[#D97706]",
    borderSelected: "border-[#F59E0B]",
    bgSelected: "bg-[#FFFBEB]",
    checkColor: "bg-[#F59E0B]",
    label: "Food",
    description: "Meals, groceries, restaurants",
  },
  energy: {
    iconBg: "bg-[#FEF9C3]",
    iconColor: "text-[#CA8A04]",
    borderSelected: "border-[#EAB308]",
    bgSelected: "bg-[#FEFCE8]",
    checkColor: "bg-[#EAB308]",
    label: "Energy",
    description: "Electricity, heating, cooling",
  },
  shopping: {
    iconBg: "bg-[#EDE9FE]",
    iconColor: "text-[#7C3AED]",
    borderSelected: "border-[#8B5CF6]",
    bgSelected: "bg-[#F5F3FF]",
    checkColor: "bg-[#8B5CF6]",
    label: "Shopping",
    description: "Clothes, electronics, goods",
  },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } }
};

const animateIn = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 100, damping: 15 } }
};

const impactLevel = (kg: number) => {
  if (kg < 1) return { label: "Eco Hero 🌿", color: "text-[#16A34A]", bg: "bg-[#F0FDF4] border-[#BBF7D0]" };
  if (kg < 5) return { label: "Improving 🌱", color: "text-[#D97706]", bg: "bg-[#FFFBEB] border-[#FDE68A]" };
  return { label: "Needs Work ⚠️", color: "text-[#DC2626]", bg: "bg-[#FEF2F2] border-[#FECACA]" };
};

export default function LogActivity() {
  const { t } = useTranslation();
  const sessionId = useSessionId();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [category, setCategory] = useState<ActivityCategory | null>(null);
  const [activityType, setActivityType] = useState<string | null>(null);
  const [value, setValue] = useState<string>("");
  const [result, setResult] = useState<LogResult | null>(null);
  const [, setHasLogged] = useLogState();

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
      setHasLogged(true);

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
      toast({ title: t("logActivity.error"), variant: "destructive" });
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

  return (
    <div className="max-w-2xl mx-auto space-y-0">
      {/* ── Page Header (SaaS mockup style) ── */}
      <div className="saas-page-header rounded-xl mb-6">
        <div>
          <h1 className="text-xl font-bold text-[#1F2937] tracking-tight">
            {t("logActivity.title")}
          </h1>
          <p className="text-[#6B7280] text-sm mt-0.5">{t("logActivity.desc")}</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/insights">
            <Button
              variant="outline"
              size="sm"
              className="text-[#374151] border-[#E5E7EB] hover:border-[#16A34A] hover:text-[#16A34A] text-xs font-medium rounded-lg gap-1.5 cursor-pointer"
            >
              <History className="h-3.5 w-3.5" />
              Activity History
            </Button>
          </Link>
          <button className="w-9 h-9 rounded-lg border border-[#E5E7EB] bg-white flex items-center justify-center text-[#6B7280] hover:text-[#1F2937] hover:border-[#D1D5DB] transition-colors">
            <Bell className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-2 pl-1">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#16A34A] to-[#22C55E] flex items-center justify-center text-white text-xs font-bold shadow-sm">
              S
            </div>
            <div className="hidden sm:block">
              <div className="text-xs font-semibold text-[#1F2937] leading-tight">Sarah Chen</div>
              <div className="text-[10px] font-medium text-[#16A34A] bg-[#DCFCE7] px-1.5 py-0.5 rounded-full leading-tight inline-block mt-0.5">Eco Hero</div>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {result ? (
          /* ── Success Result ── */
          <motion.div
            key="result"
            initial={{ opacity: 0, scale: 0.97, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={cn(
              "saas-card border flex flex-col items-center text-center gap-5 py-8 px-6 overflow-hidden relative",
              impactLevel(result.co2Amount).bg
            )}
          >
            <div className="h-12 w-12 rounded-full bg-white border-2 border-[#22C55E]/30 flex items-center justify-center shadow-sm">
              <CheckCircle2 className="h-6 w-6 text-[#16A34A]" />
            </div>

            <div>
              <p className="text-[10px] font-bold text-[#6B7280] uppercase tracking-widest mb-0.5">Activity Logged</p>
              <h2 className="text-lg font-extrabold text-[#1F2937] tracking-tight">{result.activityLabel}</h2>
              <p className="text-[#6B7280] text-xs font-semibold mt-0.5">{result.value} {result.unit}</p>
            </div>

            <div className="flex flex-col items-center gap-0.5 bg-white border border-[#E5E7EB] py-4 px-6 rounded-2xl min-w-[200px] shadow-sm">
              <span className="text-4xl font-black text-[#1F2937]">
                <CountUp end={result.co2Amount} decimals={2} duration={1} />
              </span>
              <span className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider">kg CO₂ emitted</span>
              <span className={cn("text-[9px] font-extrabold mt-2 px-2.5 py-0.5 rounded-full border uppercase tracking-wider", impactLevel(result.co2Amount).bg, impactLevel(result.co2Amount).color)}>
                {impactLevel(result.co2Amount).label}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 w-full max-w-sm text-xs mt-1">
              <div className="saas-card bg-white p-3.5 text-center border border-[#E5E7EB] shadow-sm flex flex-col justify-between">
                <div className="w-6 h-6 rounded-lg bg-[#EFF6FF] border border-[#BFDBFE] text-[#3B82F6] flex items-center justify-center mx-auto mb-2">
                  <Plane className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="font-extrabold text-sm text-[#1F2937]">{(result.co2Amount / 0.255).toFixed(0)} km</div>
                  <div className="text-[#6B7280] text-[10px] font-medium mt-0.5">flight equivalent</div>
                </div>
              </div>
              <div className="saas-card bg-white p-3.5 text-center border border-[#E5E7EB] shadow-sm flex flex-col justify-between">
                <div className="w-6 h-6 rounded-lg bg-[#F0FDF4] border border-[#BBF7D0] text-[#16A34A] flex items-center justify-center mx-auto mb-2">
                  <Trees className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="font-extrabold text-sm text-[#1F2937]">{(result.co2Amount / 21.77).toFixed(2)}</div>
                  <div className="text-[#6B7280] text-[10px] font-medium mt-0.5">trees needed/year</div>
                </div>
              </div>
            </div>

            <div className="flex gap-3 w-full max-w-sm pt-2">
              <Button
                onClick={handleReset}
                variant="outline"
                className="flex-1 py-4 h-auto text-xs font-bold gap-1.5 cursor-pointer rounded-xl border-[#E5E7EB] hover:border-[#16A34A] hover:text-[#16A34A]"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Log Another
              </Button>
              <Link href="/insights" className="flex-1">
                <Button className="w-full py-4 h-auto text-xs font-bold text-white gap-1.5 cursor-pointer rounded-xl"
                  style={{ background: "linear-gradient(135deg, #16A34A 0%, #22C55E 100%)" }}>
                  <BarChart3 className="h-3.5 w-3.5" /> View Insights
                </Button>
              </Link>
            </div>
          </motion.div>
        ) : (
          /* ── Log Form ── */
          <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <form onSubmit={handleSubmit} className="space-y-6">

              {/* ── Step 1: Category ── */}
              <div className="saas-card border border-[#E5E7EB]">
                <div className="mb-4">
                  <h2 className="text-base font-bold text-[#1F2937]">1. Select Category</h2>
                  <p className="text-[#6B7280] text-sm mt-0.5">Choose the type of activity you want to log</p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {(Object.keys(CATEGORY_LABELS) as ActivityCategory[]).map((cat) => {
                    const CatIcon = CATEGORY_ICONS[cat];
                    const cfg = CATEGORY_CONFIG[cat];
                    const isSelected = category === cat;

                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => { setCategory(cat); setActivityType(null); setValue(""); }}
                        className={cn(
                          "category-card",
                          isSelected && `selected-${cat}`
                        )}
                      >
                        {/* Checkmark badge */}
                        {isSelected && (
                          <div className={cn("absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center", cfg.checkColor)}>
                            <Check className="h-3 w-3 text-white" />
                          </div>
                        )}

                        {/* Icon circle */}
                        <div className={cn("w-11 h-11 rounded-full flex items-center justify-center mb-3 text-xl", cfg.iconBg)}>
                          <span>{CATEGORY_EMOJIS[cat]}</span>
                        </div>

                        <span className={cn("text-sm font-semibold text-[#1F2937]")}>{cfg.label}</span>
                        <span className="text-[11px] text-[#6B7280] text-center leading-tight mt-1">{cfg.description}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ── Step 2: Activity Type ── */}
              <AnimatePresence mode="popLayout">
                {category && (
                  <motion.div
                    variants={staggerContainer}
                    initial="hidden"
                    animate="show"
                    exit="hidden"
                    className="saas-card border border-[#E5E7EB] overflow-hidden"
                  >
                    <div className="mb-3">
                      <h2 className="text-base font-bold text-[#1F2937]">2. What did you do?</h2>
                      <p className="text-[#6B7280] text-sm mt-0.5">Select the specific activity</p>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-2">
                      {ACTIVITY_TYPES[category].map((act) => {
                        const isSelected = activityType === act.id;
                        return (
                          <motion.button
                            variants={animateIn}
                            key={act.id}
                            type="button"
                            onClick={() => { setActivityType(act.id); if (!value) setValue("1"); }}
                            className={cn(
                              "flex items-center gap-3 p-3 rounded-xl border transition-all text-left cursor-pointer",
                              isSelected
                                ? "border-[#22C55E] bg-[#F0FDF4] shadow-sm"
                                : "border-[#E5E7EB] bg-white hover:border-[#D1D5DB] hover:shadow-sm"
                            )}
                          >
                            <div className={cn(
                              "p-2 rounded-lg shrink-0 border transition-all",
                              isSelected
                                ? "bg-[#16A34A] text-white border-transparent"
                                : "bg-[#F9FAFB] text-[#6B7280] border-[#E5E7EB]"
                            )}>
                              <act.icon className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                              <div className={cn("font-semibold text-sm truncate", isSelected ? "text-[#15803D]" : "text-[#1F2937]")}>{act.label}</div>
                              <div className="text-[10px] text-[#6B7280] font-medium uppercase tracking-wider mt-0.5">per {act.unit}</div>
                            </div>
                          </motion.button>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* ── Step 3: Quantity ── */}
              <AnimatePresence mode="popLayout">
                {activityType && selectedActivityDef && (
                  <motion.div
                    variants={animateIn}
                    initial="hidden"
                    animate="show"
                    exit="hidden"
                    className="saas-card border border-[#E5E7EB] overflow-hidden"
                  >
                    <div className="mb-3">
                      <h2 className="text-base font-bold text-[#1F2937]">3. How much?</h2>
                      <p className="text-[#6B7280] text-sm mt-0.5">Enter the quantity for this activity</p>
                    </div>
                    <div className="flex gap-4 items-center">
                      <div className="relative flex-1 max-w-[200px]">
                        <Input
                          type="number" min="0.1" step="0.1" required
                          value={value}
                          onChange={(e) => setValue(e.target.value)}
                          className="text-sm font-semibold py-2.5 pl-4 pr-16 bg-white border-[#E5E7EB] focus-visible:ring-[#16A34A]/20 rounded-xl"
                        />
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] text-[#6B7280] font-bold uppercase tracking-wider">
                          {selectedActivityDef.unit}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* ── Live CO₂ Preview ── */}
              <AnimatePresence>
                {previewCo2 !== null && previewCo2 > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className={cn("rounded-xl border p-4 flex items-center gap-4", impactLevel(previewCo2).bg)}
                  >
                    <div className="flex-1 space-y-0.5">
                      <p className="text-[10px] text-[#6B7280] font-bold uppercase tracking-wider">Estimated Carbon Footprint</p>
                      <p className={cn("text-2xl font-black tracking-tight", impactLevel(previewCo2).color)}>
                        <CountUp end={previewCo2} decimals={2} duration={0.3} /> kg CO₂
                      </p>
                    </div>
                    <div className="text-right text-[10px] text-[#6B7280] font-bold tracking-wider uppercase space-y-1">
                      <div className="bg-white/70 px-2 py-0.5 rounded border border-[#E5E7EB] inline-block">
                        = {(previewCo2 / 0.255).toFixed(0)} km flight
                      </div>
                      <div className={cn("block font-extrabold", impactLevel(previewCo2).color)}>{impactLevel(previewCo2).label}</div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* ── CTA Button ── */}
              <div>
                <Button
                  type="submit"
                  id="log-activity-submit"
                  className="w-full h-12 text-sm font-bold text-white rounded-xl shadow-md cursor-pointer transition-all hover:opacity-95 hover:shadow-lg"
                  style={{ background: "linear-gradient(135deg, #16A34A 0%, #22C55E 100%)" }}
                  disabled={!category || !activityType || !value || isNaN(Number(value)) || createActivity.isPending}
                >
                  {createActivity.isPending ? (
                    <><Loader2 className="mr-1.5 h-4 w-4 animate-spin" />Saving…</>
                  ) : (
                    <><Leaf className="h-4 w-4 mr-2" />{t("logActivity.logButton")}</>
                  )}
                </Button>

                {/* Privacy Footer */}
                <div className="flex items-center justify-center gap-1.5 mt-3">
                  <Shield className="h-3.5 w-3.5 text-[#9CA3AF]" />
                  <p className="text-[11px] text-[#9CA3AF] text-center">
                    Your data is private and used only to calculate your carbon footprint
                  </p>
                </div>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
