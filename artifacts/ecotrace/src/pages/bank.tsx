import { useState } from "react";
import { useSessionId } from "@/hooks/use-session";
import { useCreateActivity, getGetActivitySummaryQueryKey, getListActivitiesQueryKey, getGetActivityStreakQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { CreditCard, Building2, CheckCircle2, ArrowRight, Loader2, RefreshCw, Leaf } from "lucide-react";
import { cn } from "@/lib/utils";

const MOCK_BANKS = [
  { id: "chase", name: "Chase", color: "bg-blue-600", initial: "C" },
  { id: "bofa", name: "Bank of America", color: "bg-red-600", initial: "B" },
  { id: "wells", name: "Wells Fargo", color: "bg-yellow-600", initial: "W" },
  { id: "citi", name: "Citibank", color: "bg-blue-800", initial: "C" },
  { id: "amex", name: "American Express", color: "bg-slate-700", initial: "A" },
  { id: "capital", name: "Capital One", color: "bg-red-700", initial: "C" },
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

type Stage = "select-bank" | "connecting" | "transactions" | "done";

export default function BankPage() {
  const sessionId = useSessionId();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const createActivity = useCreateActivity();

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

  const totalCo2 = transactions.filter((t) => t.selected).reduce((s, t) => s + t.co2Estimate, 0);

  const handleImport = async () => {
    if (!sessionId) return;
    const selected = transactions.filter((t) => t.selected);
    if (!selected.length) return;
    setImporting(true);
    try {
      await Promise.all(
        selected.map((t) =>
          createActivity.mutateAsync({
            data: { sessionId, category: t.category, activityType: t.activityType, value: t.value },
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
      toast({ title: "Import complete", description: `${selected.length} transactions imported as CO₂ activities.` });
    } catch {
      toast({ title: "Import failed", variant: "destructive" });
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

  const fade = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

  return (
    <div className="p-6 md:p-8 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Connect Bank Account</h1>
        <p className="text-muted-foreground mt-1">Auto-import transactions and estimate their carbon footprint.</p>
      </div>

      <AnimatePresence mode="wait">
        {stage === "select-bank" && (
          <motion.div key="select" variants={fade} initial="hidden" animate="show" exit={{ opacity: 0 }}>
            <Card className="shadow-md border-border/60">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-blue-500" />
                  Choose your bank
                </CardTitle>
                <CardDescription>We'll scan your recent transactions and map them to carbon activities. Running in demo mode — no real credentials needed.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {MOCK_BANKS.map((bank) => (
                    <button
                      key={bank.id}
                      onClick={() => handleBankSelect(bank)}
                      className="flex items-center gap-3 p-4 rounded-xl border border-border/60 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/20 transition-all text-left group"
                    >
                      <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center text-white font-bold text-sm shrink-0", bank.color)}>
                        {bank.initial}
                      </div>
                      <span className="font-medium text-sm text-foreground group-hover:text-blue-600 transition-colors">{bank.name}</span>
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-5 p-3 bg-muted/40 rounded-lg flex items-start gap-2">
                  <Leaf className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
                  Demo mode: connects to a simulated account with realistic recent transactions. No real bank data is accessed.
                </p>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {stage === "connecting" && (
          <motion.div key="connecting" variants={fade} initial="hidden" animate="show" exit={{ opacity: 0 }}>
            <Card className="shadow-md border-border/60">
              <CardContent className="py-16 flex flex-col items-center gap-5">
                <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center text-white text-xl font-bold shadow-lg", selectedBank?.color)}>
                  {selectedBank?.initial}
                </div>
                <div className="text-center">
                  <p className="font-semibold text-foreground">Connecting to {selectedBank?.name}</p>
                  <p className="text-sm text-muted-foreground mt-1">Scanning recent transactions…</p>
                </div>
                <Loader2 className="h-7 w-7 text-blue-500 animate-spin" />
              </CardContent>
            </Card>
          </motion.div>
        )}

        {stage === "transactions" && (
          <motion.div key="transactions" variants={fade} initial="hidden" animate="show" exit={{ opacity: 0 }} className="space-y-4">
            <Card className="shadow-md border-border/60">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <CreditCard className="h-5 w-5 text-blue-500" />
                      Recent Transactions
                    </CardTitle>
                    <CardDescription>Select the transactions to import as CO₂ activities.</CardDescription>
                  </div>
                  <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold", selectedBank?.color)}>
                    {selectedBank?.initial}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {transactions.map((tx) => (
                  <button
                    key={tx.id}
                    onClick={() => toggleTx(tx.id)}
                    className={cn(
                      "w-full flex items-center gap-3 p-3.5 rounded-xl border transition-all text-left",
                      tx.selected
                        ? "border-blue-300 bg-blue-50/50 dark:bg-blue-950/20 dark:border-blue-700"
                        : "border-border/60 bg-card hover:bg-muted/30 opacity-60"
                    )}
                  >
                    <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center text-lg shrink-0">
                      {tx.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-foreground truncate">{tx.merchant}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {tx.date} · {tx.value} {tx.unit} · <span className="text-emerald-600 font-medium">{tx.co2Estimate} kg CO₂</span>
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="text-sm font-semibold text-foreground">${tx.amount.toFixed(2)}</div>
                      <div className={cn("w-5 h-5 rounded-full border-2 mt-1 ml-auto transition-all", tx.selected ? "bg-blue-500 border-blue-500" : "border-muted-foreground/30")} />
                    </div>
                  </button>
                ))}
              </CardContent>
            </Card>

            <Card className="shadow-sm border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20">
              <CardContent className="py-4 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {transactions.filter((t) => t.selected).length} of {transactions.length} selected
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Total estimated: <span className="font-semibold text-emerald-700">{totalCo2.toFixed(2)} kg CO₂</span>
                  </p>
                </div>
                <Button
                  onClick={handleImport}
                  disabled={importing || transactions.filter((t) => t.selected).length === 0}
                  className="bg-emerald-700 hover:bg-emerald-800 text-white gap-2 shrink-0"
                >
                  {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                  {importing ? "Importing…" : "Import Selected"}
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {stage === "done" && (
          <motion.div key="done" variants={fade} initial="hidden" animate="show" exit={{ opacity: 0 }}>
            <Card className="shadow-md border-emerald-200">
              <CardContent className="py-16 flex flex-col items-center gap-5 text-center">
                <CheckCircle2 className="h-16 w-16 text-emerald-500" />
                <div>
                  <h2 className="text-xl font-bold text-foreground">Import complete!</h2>
                  <p className="text-muted-foreground mt-1 text-sm">
                    {importedCount} transaction{importedCount !== 1 ? "s" : ""} have been logged as CO₂ activities.
                  </p>
                </div>
                <div className="flex gap-3 mt-2">
                  <a href="/dashboard">
                    <Button className="bg-emerald-700 hover:bg-emerald-800 text-white gap-2">
                      View Dashboard <ArrowRight className="h-4 w-4" />
                    </Button>
                  </a>
                  <Button variant="outline" onClick={reset} className="gap-2">
                    <RefreshCw className="h-4 w-4" /> Connect Another
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
