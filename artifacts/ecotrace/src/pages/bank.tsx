import { useState } from "react";
import { useSessionId } from "@/hooks/use-session";
import { useLogState } from "@/hooks/use-log-state";
import { useCreateActivity, getGetActivitySummaryQueryKey, getListActivitiesQueryKey, getGetActivityStreakQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { CreditCard, Building2, CheckCircle2, ArrowRight, Loader2, RefreshCw, Leaf, Sparkles, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

const MOCK_BANKS = [
  { id: "chase", name: "Chase", gradient: "from-blue-500 to-blue-700", initial: "C" },
  { id: "bofa", name: "Bank of America", gradient: "from-red-500 to-red-700", initial: "B" },
  { id: "wells", name: "Wells Fargo", gradient: "from-yellow-500 to-amber-600", initial: "W" },
  { id: "citi", name: "Citibank", gradient: "from-sky-500 to-blue-800", initial: "C" },
  { id: "amex", name: "American Express", gradient: "from-slate-500 to-slate-700", initial: "A" },
  { id: "capital", name: "Capital One", gradient: "from-rose-500 to-red-700", initial: "C" },
];

interface Transaction {
  id: string;
  merchant: string;
  amount: number;
  date: string;
  category: string;
  activityType: string;
  value: number;
  co2Estimate: number;
  unit: string;
  icon: string;
  selected: boolean;
}

function generateTransactions(): Transaction[] {
  const now = new Date();
  const rows: Omit<Transaction, "id" | "selected">[] = [
    {
      merchant: "Shell Gas Station",
      amount: 62.40,
      date: daysAgo(now, 0),
      category: "transport",
      activityType: "car_km",
      value: 297,
      co2Estimate: +(297 * 0.21).toFixed(2),
      unit: "km",
      icon: "⛽",
    },
    {
      merchant: "United Airlines",
      amount: 389.00,
      date: daysAgo(now, 2),
      category: "transport",
      activityType: "flight_km",
      value: 1200,
      co2Estimate: +(1200 * 0.255).toFixed(2),
      unit: "km",
      icon: "✈️",
    },
    {
      merchant: "Whole Foods Market",
      amount: 87.23,
      date: daysAgo(now, 1),
      category: "food",
      activityType: "beef_meal",
      value: 3,
      co2Estimate: +(3 * 6.61).toFixed(2),
      unit: "meals",
      icon: "🛒",
    },
    {
      merchant: "Amazon.com",
      amount: 54.99,
      date: daysAgo(now, 3),
      category: "shopping",
      activityType: "online_purchase",
      value: 2,
      co2Estimate: +(2 * 0.5).toFixed(2),
      unit: "deliveries",
      icon: "📦",
    },
    {
      merchant: "PG&E Electric Utility",
      amount: 120.00,
      date: daysAgo(now, 4),
      category: "energy",
      activityType: "electricity_kwh",
      value: 515,
      co2Estimate: +(515 * 0.233).toFixed(2),
      unit: "kWh",
      icon: "⚡",
    },
    {
      merchant: "Uber",
      amount: 18.50,
      date: daysAgo(now, 1),
      category: "transport",
      activityType: "car_km",
      value: 12,
      co2Estimate: +(12 * 0.21).toFixed(2),
      unit: "km",
      icon: "🚗",
    },
    {
      merchant: "H&M",
      amount: 79.00,
      date: daysAgo(now, 5),
      category: "shopping",
      activityType: "new_clothing",
      value: 3,
      co2Estimate: +(3 * 5.5).toFixed(2),
      unit: "items",
      icon: "👕",
    },
    {
      merchant: "Chipotle Mexican Grill",
      amount: 14.85,
      date: daysAgo(now, 2),
      category: "food",
      activityType: "chicken_meal",
      value: 1,
      co2Estimate: +(1 * 3.05).toFixed(2),
      unit: "meals",
      icon: "🌯",
    },
  ];
  return rows.map((r, i) => ({ ...r, id: String(i), selected: true }));
}

function daysAgo(from: Date, days: number): string {
  const d = new Date(from);
  d.setDate(d.getDate() - days);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/** Get carbon-impact color based on CO₂ amount */
function getCarbonColor(co2: number): string {
  if (co2 < 3) return "text-[var(--carbon-low)]";
  if (co2 < 20) return "text-[var(--carbon-warning)]";
  if (co2 < 100) return "text-[var(--carbon-medium)]";
  return "text-[var(--carbon-high)]";
}

function getCarbonBg(co2: number): string {
  if (co2 < 3) return "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200/60 dark:border-emerald-800/40";
  if (co2 < 20) return "bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200/60 dark:border-yellow-800/40";
  if (co2 < 100) return "bg-orange-50 dark:bg-orange-950/20 border-orange-200/60 dark:border-orange-800/40";
  return "bg-red-50 dark:bg-red-950/20 border-red-200/60 dark:border-red-800/40";
}

/** Mini SVG circular CO₂ ring */
function CarbonRing({ value, max, size = 56 }: { value: number; max: number; size?: number }) {
  const r = (size - 6) / 2;
  const circumference = 2 * Math.PI * r;
  const pct = Math.min(value / max, 1);
  const offset = circumference * (1 - pct);

  // Carbon color based on percentage
  const strokeColor =
    pct < 0.25 ? "var(--carbon-low)" :
    pct < 0.5 ? "var(--carbon-warning)" :
    pct < 0.75 ? "var(--carbon-medium)" :
    "var(--carbon-high)";

  return (
    <svg width={size} height={size} className="shrink-0 -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" className="text-muted/30" strokeWidth={4} />
      <motion.circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={strokeColor}
        strokeWidth={4}
        strokeLinecap="round"
        strokeDasharray={circumference}
        initial={{ strokeDashoffset: circumference }}
        animate={{ strokeDashoffset: offset }}
        transition={{ duration: 1, ease: "easeOut" }}
      />
    </svg>
  );
}

type Stage = "select-bank" | "connecting" | "transactions" | "done";

const container = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0 } };
const fade = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

export default function BankPage() {
  const { t } = useTranslation();
  const sessionId = useSessionId();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const createActivity = useCreateActivity();
  const [, setHasLogged] = useLogState();

  const [stage, setStage] = useState<Stage>("select-bank");
  const [selectedBank, setSelectedBank] = useState<(typeof MOCK_BANKS)[0] | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [importing, setImporting] = useState(false);
  const [importedCount, setImportedCount] = useState(0);

  const handleBankSelect = (bank: (typeof MOCK_BANKS)[0]) => {
    setSelectedBank(bank);
    setStage("connecting");
    setTimeout(() => {
      setTransactions(generateTransactions());
      setStage("transactions");
    }, 2200);
  };

  const toggleTx = (id: string) => {
    setTransactions((prev) => prev.map((t) => t.id === id ? { ...t, selected: !t.selected } : t));
  };

  const selectedTxs = transactions.filter((t) => t.selected);
  const totalCo2 = selectedTxs.reduce((s, t) => s + t.co2Estimate, 0);
  const maxCo2 = transactions.reduce((s, t) => s + t.co2Estimate, 0);

  const handleImport = async () => {
    if (!sessionId) return;
    const selected = transactions.filter((t) => t.selected);
    if (!selected.length) return;
    setImporting(true);
    try {
      await Promise.all(
        selected.map((t) =>
          createActivity.mutateAsync({
            data: { sessionId, category: t.category as any, activityType: t.activityType, value: t.value },
          })
        )
      );
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: getListActivitiesQueryKey({ sessionId }) }),
        queryClient.invalidateQueries({ queryKey: getGetActivitySummaryQueryKey({ sessionId, days: 7 }) }),
        queryClient.invalidateQueries({ queryKey: getGetActivityStreakQueryKey({ sessionId }) }),
      ]);
      setImportedCount(selected.length);
      setStage("done");
      setHasLogged(true);
      toast({ title: t("bankImport.toast.successTitle"), description: t("bankImport.toast.successDesc", { count: selected.length }) });
    } catch {
      toast({ title: t("bankImport.toast.failTitle"), variant: "destructive" });
    } finally {
      setImporting(false);
    }
  };

  const reset = () => {
    setStage("select-bank");
    setSelectedBank(null);
    setTransactions([]);
    setImportedCount(0);
  };

  return (
    <motion.div
      className="p-4 md:p-6 max-w-3xl mx-auto space-y-4"
      variants={container}
      initial="hidden"
      animate="show"
    >
      {/* Page Header */}
      <motion.div variants={item} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-border/80">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-[#DCFCE7] flex items-center justify-center border border-[#BBF7D0]">
            <Building2 className="h-5 w-5 text-[#16A34A]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">{t("bankImport.title")}</h1>
            <p className="text-muted-foreground text-xs mt-0.5">{t("bankImport.desc")}</p>
          </div>
        </div>
        <Button variant="outline" className="h-9 border-border/80 text-muted-foreground hover:text-foreground text-xs font-semibold px-4 rounded-xl gap-2 self-start sm:self-auto">
          <Building2 className="h-3.5 w-3.5" />
          Import History
        </Button>
      </motion.div>

      <AnimatePresence mode="wait">
        {/* ── Stage 1: Select Bank ── */}
        {stage === "select-bank" && (
          <motion.div key="select" variants={fade} initial="hidden" animate="show" exit={{ opacity: 0 }}>
            <div className="rounded-2xl border border-border/60 bg-white p-6 shadow-sm">
              <div className="mb-4">
                <div className="flex items-center gap-2 font-semibold text-base text-foreground">
                  <Building2 className="h-4 w-4 text-[#16A34A]" />
                  {t("bankImport.chooseBank")}
                </div>
                <p className="text-xs text-muted-foreground mt-1">{t("bankImport.chooseBankDesc")}</p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {MOCK_BANKS.map((bank, i) => (
                  <motion.button
                    key={bank.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.06 }}
                    onClick={() => handleBankSelect(bank)}
                    className="group relative flex flex-col items-center justify-center p-6 rounded-[14px] border border-[#E5E7EB] bg-white shadow-sm hover:border-[#16A34A]/50 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 text-center"
                  >
                    <div className={cn("w-12 h-12 rounded-full bg-gradient-to-br flex items-center justify-center text-white font-bold text-sm shadow-sm mb-3", bank.gradient)}>
                      {bank.initial}
                    </div>
                    <span className="font-semibold text-xs text-foreground group-hover:text-[#16A34A] transition-colors">{bank.name}</span>
                  </motion.button>
                ))}
              </div>
              <div className="text-[10px] text-muted-foreground mt-5 p-3 bg-neutral-50 rounded-xl flex items-start gap-2 leading-relaxed border border-[#E5E7EB]">
                <Lock className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                <span>{t("bankImport.demoWarn")}</span>
              </div>
            </div>
          </motion.div>
        )}

        {/* ── Stage 2: Connecting Animation ── */}
        {stage === "connecting" && (
          <motion.div key="connecting" variants={fade} initial="hidden" animate="show" exit={{ opacity: 0 }}>
            <div className="rounded-2xl border border-border/60 bg-[var(--bg-glass)] backdrop-blur-xl shadow-[var(--shadow-soft)]">
              <div className="py-14 flex flex-col items-center gap-5">
                <motion.div
                  className={cn("w-14 h-14 rounded-2xl bg-gradient-to-br flex items-center justify-center text-white text-lg font-bold shadow-lg", selectedBank?.gradient)}
                  animate={{ scale: [1, 1.08, 1], boxShadow: ["0 0 0 0 rgba(22,163,74,0)", "0 0 30px 8px rgba(22,163,74,0.3)", "0 0 0 0 rgba(22,163,74,0)"] }}
                  transition={{ duration: 1.8, repeat: Infinity }}
                >
                  {selectedBank?.initial}
                </motion.div>
                <div className="text-center">
                  <p className="font-semibold text-sm text-foreground">{t("bankImport.connectingTo", { bank: selectedBank?.name })}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{t("bankImport.scanning")}</p>
                </div>
                {/* Animated scanning dots */}
                <div className="flex items-center gap-1.5">
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      className="h-2 w-2 rounded-full bg-[var(--eco-primary)]"
                      animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8] }}
                      transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.25 }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* ── Stage 3: Transactions ── */}
        {stage === "transactions" && (
          <motion.div key="transactions" variants={fade} initial="hidden" animate="show" exit={{ opacity: 0 }} className="space-y-3">
            {/* Transaction list card */}
            <div className="rounded-2xl border border-border/60 bg-[var(--bg-glass)] backdrop-blur-xl p-5 shadow-[var(--shadow-soft)]">
              <div className="mb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 font-semibold text-base text-foreground">
                      <CreditCard className="h-4 w-4 text-[var(--eco-primary)]" />
                      {t("bankImport.recentTx")}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{t("bankImport.selectTxDesc")}</p>
                  </div>
                  <div className={cn("w-9 h-9 rounded-lg bg-gradient-to-br flex items-center justify-center text-white font-bold text-xs shadow-sm", selectedBank?.gradient)}>
                    {selectedBank?.initial}
                  </div>
                </div>
              </div>
              <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1 scrollbar-thin">
                {transactions.map((tx, i) => (
                  <motion.button
                    key={tx.id}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    onClick={() => toggleTx(tx.id)}
                    className={cn(
                      "w-full flex items-center gap-3 p-3 rounded-xl border transition-all duration-200 text-left group",
                      tx.selected
                        ? "border-[var(--eco-primary)]/40 bg-[var(--eco-soft)]/20 dark:bg-[var(--eco-primary)]/10 shadow-sm"
                        : "border-border/40 bg-card/50 hover:bg-muted/30 opacity-55"
                    )}
                  >
                    <div className="w-9 h-9 rounded-xl bg-muted/80 dark:bg-muted/30 flex items-center justify-center text-lg shrink-0">
                      {tx.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-xs text-foreground truncate">{tx.merchant}</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1 flex-wrap">
                        {tx.date} · {tx.value} {tx.unit} ·
                        <span className={cn("font-semibold", getCarbonColor(tx.co2Estimate))}>{tx.co2Estimate} kg CO₂</span>
                      </div>
                    </div>
                    <div className="shrink-0 text-right flex items-center gap-2.5">
                      <div className="text-xs font-semibold text-foreground">${tx.amount.toFixed(2)}</div>
                      <div className={cn(
                        "w-5 h-5 rounded-full border-2 transition-all shrink-0 flex items-center justify-center",
                        tx.selected
                          ? "bg-[var(--eco-primary)] border-[var(--eco-primary)] shadow-[0_0_8px_rgba(22,163,74,0.4)]"
                          : "border-muted-foreground/30"
                      )}>
                        {tx.selected && <CheckCircle2 className="h-3 w-3 text-white" />}
                      </div>
                    </div>
                  </motion.button>
                ))}
              </div>
            </div>

            {/* CO₂ Summary + Import Bar */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className={cn(
                "rounded-2xl border p-4 shadow-sm flex items-center gap-4",
                getCarbonBg(totalCo2)
              )}
            >
              {/* Carbon ring */}
              <div className="relative">
                <CarbonRing value={totalCo2} max={maxCo2 || 1} />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className={cn("text-[9px] font-bold", getCarbonColor(totalCo2))}>
                    {totalCo2.toFixed(0)}
                  </span>
                </div>
              </div>

              <div className="flex-1">
                <p className="text-xs font-semibold text-foreground">
                  {t("bankImport.selectedOfTotal", { selected: selectedTxs.length, total: transactions.length })}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {t("bankImport.totalEstimated", { co2: totalCo2.toFixed(2) })}
                </p>
              </div>

              <Button
                onClick={handleImport}
                size="sm"
                disabled={importing || selectedTxs.length === 0}
                className="bg-[var(--eco-primary)] hover:bg-[var(--eco-best)] text-white gap-1.5 shrink-0 rounded-xl text-xs h-9 shadow-md hover:shadow-[var(--glow-green)] transition-all duration-300"
              >
                {importing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ArrowRight className="h-3.5 w-3.5" />}
                {importing ? t("bankImport.importing") : t("bankImport.importSelected")}
              </Button>
            </motion.div>
          </motion.div>
        )}

        {/* ── Stage 4: Done / Success ── */}
        {stage === "done" && (
          <motion.div key="done" variants={fade} initial="hidden" animate="show" exit={{ opacity: 0 }}>
            <div className="rounded-2xl border-2 border-[var(--eco-primary)]/30 bg-gradient-to-br from-[var(--eco-soft)]/30 to-[var(--eco-light)]/10 dark:from-[var(--eco-primary)]/10 dark:to-[var(--eco-best)]/10 backdrop-blur-xl shadow-[var(--shadow-soft)] overflow-hidden relative">
              {/* Decorative floating particles */}
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {[...Array(6)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="absolute text-lg"
                    initial={{
                      x: `${30 + Math.random() * 40}%`,
                      y: "100%",
                      opacity: 0,
                    }}
                    animate={{
                      y: "-10%",
                      opacity: [0, 1, 0],
                      x: `${20 + Math.random() * 60}%`,
                    }}
                    transition={{
                      duration: 2.5 + Math.random() * 1.5,
                      delay: i * 0.3,
                      repeat: Infinity,
                      repeatDelay: 1,
                    }}
                  >
                    {["🌱", "🍃", "✨", "🌿", "💚", "🌳"][i]}
                  </motion.div>
                ))}
              </div>

              <div className="relative py-14 flex flex-col items-center gap-5 text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 200, damping: 12 }}
                >
                  <div className="w-16 h-16 rounded-full bg-[var(--eco-primary)] flex items-center justify-center shadow-[var(--glow-green)]">
                    <CheckCircle2 className="h-8 w-8 text-white" />
                  </div>
                </motion.div>
                <div>
                  <h2 className="text-lg font-bold text-foreground">{t("bankImport.completeTitle")}</h2>
                  <p className="text-muted-foreground mt-0.5 text-xs">
                    {t("bankImport.completeDesc", { count: importedCount })}
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <Sparkles className="h-3.5 w-3.5 text-[var(--eco-primary)]" />
                  <span className="text-muted-foreground">Your eco-score is being updated</span>
                </div>
                <div className="flex gap-2.5 mt-2">
                  <a href="/dashboard">
                    <Button size="sm" className="bg-[var(--eco-primary)] hover:bg-[var(--eco-best)] text-white gap-1.5 rounded-xl text-xs h-9 shadow-md hover:shadow-[var(--glow-green)] transition-all">
                      {t("bankImport.viewDashboard")} <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </a>
                  <Button size="sm" variant="outline" onClick={reset} className="gap-1.5 rounded-xl text-xs h-9 border-[var(--eco-primary)]/30 hover:border-[var(--eco-primary)]/60">
                    <RefreshCw className="h-3.5 w-3.5" /> {t("bankImport.connectAnother")}
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
