import { useState } from "react";
import { useSessionId } from "@/hooks/use-session";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { useTranslation } from "react-i18next";
import {
  Coins, DollarSign, ShoppingBag, Heart, ArrowUp, ArrowDown,
  Leaf, Trophy, Sparkles, Coffee, Car, ShoppingCart, Zap, Trees
} from "lucide-react";

const container = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0 } };

const DEALS = [
  { id: "coffee", coins: 10, value: 150, icon: Coffee, color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-950/20", border: "border-amber-200/60 dark:border-amber-800/40" },
  { id: "uber", coins: 15, value: 100, icon: Car, color: "text-slate-600", bg: "bg-slate-50 dark:bg-slate-950/20", border: "border-slate-200/60 dark:border-slate-800/40" },
  { id: "amazon", coins: 20, value: 200, icon: ShoppingCart, color: "text-orange-600", bg: "bg-orange-50 dark:bg-orange-950/20", border: "border-orange-200/60 dark:border-orange-800/40" },
  { id: "grocery", coins: 8, value: 120, icon: ShoppingBag, color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950/20", border: "border-emerald-200/60 dark:border-emerald-800/40" },
];

const COMPANIES = [
  { id: "ola", defaultCoins: 10 },
  { id: "tata", defaultCoins: 10 },
  { id: "mahindra", defaultCoins: 10 },
];

const PROJECTS = [
  { id: "mangrove", icon: Trees, defaultCoins: 5 },
  { id: "solar", icon: Zap, defaultCoins: 5 },
  { id: "clean_water", icon: Leaf, defaultCoins: 5 },
];

const LEVEL_GRADIENTS: Record<string, { gradient: string; glow: string }> = {
  "Eco Beginner": { gradient: "from-slate-400 to-slate-600", glow: "rgba(148,163,184,0.3)" },
  "Eco Smart": { gradient: "from-emerald-400 to-emerald-600", glow: "rgba(52,211,153,0.3)" },
  "Eco Pro": { gradient: "from-blue-400 to-blue-600", glow: "rgba(96,165,250,0.3)" },
  "Eco Legend": { gradient: "from-yellow-400 to-amber-600", glow: "rgba(251,191,36,0.4)" },
};

const txIcon = (type: string) => {
  if (type === "earn") return <ArrowUp className="h-3.5 w-3.5 text-emerald-500" />;
  if (type === "sell") return <DollarSign className="h-3.5 w-3.5 text-blue-500" />;
  if (type === "donate") return <Heart className="h-3.5 w-3.5 text-red-500" />;
  return <ShoppingBag className="h-3.5 w-3.5 text-orange-500" />;
};

export default function Rewards() {
  const { t } = useTranslation();
  const sessionId = useSessionId();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"swap" | "sell" | "donate">("swap");
  const [sellCompany, setSellCompany] = useState(COMPANIES[0].id);
  const [sellCoins, setSellCoins] = useState(10);
  const [donateProject, setDonateProject] = useState(PROJECTS[0].id);
  const [donateCoins, setDonateCoins] = useState(5);

  const { data: wallet, isLoading: loadingWallet } = useQuery({
    queryKey: ["wallet", sessionId],
    queryFn: async () => {
      const r = await axios.get(`/api/wallet?sessionId=${sessionId}`);
      return r.data as { coinBalance: number; moneyBalance: number };
    },
    enabled: !!sessionId,
  });

  const { data: loyalty } = useQuery({
    queryKey: ["loyalty", sessionId],
    queryFn: async () => {
      const r = await axios.get(`/api/loyalty?sessionId=${sessionId}`);
      return r.data as { level: string; rewardsMonthly: number; nextLevel: string | null; progress: number; coins: number; nextLevelCoins: number | null };
    },
    enabled: !!sessionId,
  });

  const { data: txns = [] } = useQuery({
    queryKey: ["wallet-txns", sessionId],
    queryFn: async () => {
      const r = await axios.get(`/api/wallet/transactions?sessionId=${sessionId}`);
      return r.data as Array<{ id: number; transactionType: string; coins: number; money: number; description: string; createdAt: string }>;
    },
    enabled: !!sessionId,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["wallet", sessionId] });
    queryClient.invalidateQueries({ queryKey: ["wallet-txns", sessionId] });
    queryClient.invalidateQueries({ queryKey: ["loyalty", sessionId] });
  };

  const earnMutation = useMutation({
    mutationFn: async () => {
      const r = await axios.post("/api/wallet/earn", { sessionId, coins: 25, description: "Demo: Passive home savings" });
      return r.data;
    },
    onSuccess: () => {
      invalidate();
      toast({ title: t("rewardsPage.toast.passiveEarnTitle"), description: t("rewardsPage.toast.passiveEarnDesc") });
    },
  });

  const swapMutation = useMutation({
    mutationFn: async (dealId: string) => {
      const r = await axios.post("/api/wallet/swap", { sessionId, dealId });
      return r.data;
    },
    onSuccess: (data) => {
      invalidate();
      toast({
        title: t("rewardsPage.toast.swapSuccessTitle", { discount: data.discount }),
        description: t("rewardsPage.toast.swapSuccessDesc", { qrCode: data.qrCode }),
      });
    },
    onError: () => toast({ title: t("rewardsPage.toast.notEnoughCoins"), variant: "destructive" }),
  });

  const sellMutation = useMutation({
    mutationFn: async () => {
      const r = await axios.post("/api/wallet/sell", { sessionId, companyId: sellCompany, coinsToSell: sellCoins });
      return r.data;
    },
    onSuccess: (data) => {
      invalidate();
      const compName = t(`rewardsPage.companies.${sellCompany}.name`, sellCompany);
      toast({
        title: t("rewardsPage.toast.sellSuccessTitle", { money: data.moneyEarned }),
        description: t("rewardsPage.toast.sellSuccessDesc", { coins: sellCoins, company: compName }),
      });
    },
    onError: () => toast({ title: t("rewardsPage.toast.notEnoughCoins"), variant: "destructive" }),
  });

  const donateMutation = useMutation({
    mutationFn: async () => {
      const r = await axios.post("/api/wallet/donate", { sessionId, projectId: donateProject, coinsDonated: donateCoins });
      return r.data;
    },
    onSuccess: () => {
      invalidate();
      const projName = t(`rewardsPage.projects.${donateProject}.name`, donateProject);
      toast({
        title: t("rewardsPage.toast.donateSuccessTitle"),
        description: t("rewardsPage.toast.donateSuccessDesc", { project: projName }),
      });
    },
    onError: () => toast({ title: t("rewardsPage.toast.notEnoughCoins"), variant: "destructive" }),
  });

  const levelStyle = LEVEL_GRADIENTS[loyalty?.level ?? "Eco Beginner"] ?? LEVEL_GRADIENTS["Eco Beginner"];

  return (
    <motion.div className="saas-container max-w-4xl space-y-4" variants={container} initial="hidden" animate="show">
      {/* Page Header */}
      <motion.div variants={item}>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-yellow-400 to-amber-600 flex items-center justify-center shadow-lg" style={{ boxShadow: "0 0 20px rgba(245,158,11,0.3)" }}>
            <Coins className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{t("rewardsPage.title")}</h1>
            <p className="text-muted-foreground text-xs mt-0.5">{t("rewardsPage.desc")}</p>
          </div>
        </div>
      </motion.div>

      {/* Wallet cards */}
      <motion.div variants={item} className="grid sm:grid-cols-2 gap-3">
        {/* Eco Coins Card */}
        <div className="rounded-2xl overflow-hidden border border-yellow-200/60 dark:border-yellow-800/40 bg-gradient-to-br from-yellow-50/80 to-amber-50/80 dark:from-yellow-950/30 dark:to-amber-950/20 backdrop-blur-xl shadow-[var(--shadow-soft)] relative">
          {/* Shimmer overlay */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-yellow-200/20 to-transparent"
            animate={{ x: ["-100%", "200%"] }}
            transition={{ duration: 3, repeat: Infinity, repeatDelay: 5 }}
          />
          <div className="relative p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1.5">
                <Coins className="h-4.5 w-4.5 text-yellow-600" />
                <span className="font-semibold text-xs text-yellow-800 dark:text-yellow-300">{t("rewardsPage.ecoCoins")}</span>
              </div>
              <Badge className="bg-yellow-100/80 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 border-0 text-[10px] px-1.5 py-0.5 leading-none backdrop-blur-sm">{t("rewardsPage.earnPassively")}</Badge>
            </div>
            <p className="text-3xl font-extrabold text-yellow-700 dark:text-yellow-400 leading-none">
              {loadingWallet ? "—" : wallet?.coinBalance.toFixed(1)}
            </p>
            <p className="text-[11px] text-yellow-600 dark:text-yellow-500 mt-1">{t("rewardsPage.coinsAvailable")}</p>
            <Button
              size="sm" variant="outline"
              className="mt-3 border-yellow-300/60 dark:border-yellow-700/40 h-8 text-xs hover:bg-yellow-100/50 dark:hover:bg-yellow-900/20 hover:shadow-[0_0_12px_rgba(245,158,11,0.2)] transition-all rounded-xl"
              onClick={() => earnMutation.mutate()} disabled={earnMutation.isPending}
            >
              <Sparkles className="h-3.5 w-3.5 mr-1" />
              {earnMutation.isPending ? t("rewardsPage.earning") : t("rewardsPage.simulatePassiveEarn")}
            </Button>
          </div>
        </div>

        {/* Cash Balance Card */}
        <div className="rounded-2xl overflow-hidden border border-blue-200/60 dark:border-blue-800/40 bg-gradient-to-br from-blue-50/80 to-cyan-50/80 dark:from-blue-950/30 dark:to-cyan-950/20 backdrop-blur-xl shadow-[var(--shadow-soft)] relative">
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-200/20 to-transparent"
            animate={{ x: ["-100%", "200%"] }}
            transition={{ duration: 3, repeat: Infinity, repeatDelay: 7 }}
          />
          <div className="relative p-4">
            <div className="flex items-center gap-1.5 mb-3">
              <DollarSign className="h-4.5 w-4.5 text-blue-600" />
              <span className="font-semibold text-xs text-blue-800 dark:text-blue-300">{t("rewardsPage.cashBalance")}</span>
            </div>
            <p className="text-3xl font-extrabold text-blue-700 dark:text-blue-400 leading-none">
              ₹{loadingWallet ? "—" : wallet?.moneyBalance.toFixed(0)}
            </p>
            <p className="text-[11px] text-blue-600 dark:text-blue-500 mt-1">{t("rewardsPage.fromSellingCoins")}</p>
          </div>
        </div>
      </motion.div>

      {/* Loyalty Level */}
      {loyalty && (
        <motion.div variants={item}>
          <div className="rounded-2xl overflow-hidden border border-border/60 bg-[var(--bg-glass)] backdrop-blur-xl shadow-[var(--shadow-soft)]">
            <div className={`h-1 w-full bg-gradient-to-r ${levelStyle.gradient}`} />
            <div className="p-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <motion.div
                    className={`w-10 h-10 rounded-full bg-gradient-to-br ${levelStyle.gradient} flex items-center justify-center shrink-0 shadow-md`}
                    animate={{ boxShadow: [`0 0 0 0 ${levelStyle.glow}`, `0 0 20px 4px ${levelStyle.glow}`, `0 0 0 0 ${levelStyle.glow}`] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <Trophy className="h-5 w-5 text-white" />
                  </motion.div>
                  <div>
                    <p className="font-bold text-sm">{t(`rewardsPage.levels.${loyalty.level}`, loyalty.level)}</p>
                    <p className="text-[10px] text-muted-foreground">{t("rewardsPage.rewardsMonthly", { rewards: loyalty.rewardsMonthly })}</p>
                  </div>
                </div>
                {loyalty.nextLevel && (
                  <div className="text-right">
                    <p className="text-[10px] text-muted-foreground mb-1">
                      {t("rewardsPage.nextLevel", { level: t(`rewardsPage.levels.${loyalty.nextLevel}`, loyalty.nextLevel), coins: loyalty.nextLevelCoins })}
                    </p>
                    <div className="w-36 h-2 bg-secondary rounded-full overflow-hidden ml-auto">
                      <motion.div
                        className={`h-full bg-gradient-to-r ${levelStyle.gradient} rounded-full`}
                        initial={{ width: 0 }}
                        animate={{ width: `${loyalty.progress}%` }}
                        transition={{ duration: 1, ease: "easeOut" }}
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{t("rewardsPage.progress", { progress: loyalty.progress })}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Action Tabs */}
      <motion.div variants={item} className="space-y-3">
        <div className="flex gap-1.5 p-1 bg-muted/50 rounded-xl w-fit">
          {(["swap", "sell", "donate"] as const).map((tab) => (
            <Button
              key={tab} size="sm"
              className={`h-8 text-xs rounded-lg transition-all ${activeTab === tab ? "bg-[var(--eco-primary)] text-white shadow-md hover:bg-[var(--eco-best)]" : "bg-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50"}`}
              variant={activeTab === tab ? "default" : "ghost"}
              onClick={() => setActiveTab(tab)}
            >
              {tab === "swap" && <ShoppingBag className="h-3.5 w-3.5 mr-1" />}
              {tab === "sell" && <DollarSign className="h-3.5 w-3.5 mr-1" />}
              {tab === "donate" && <Heart className="h-3.5 w-3.5 mr-1" />}
              {t(`rewardsPage.${tab}Tab`)}
            </Button>
          ))}
        </div>

        {activeTab === "swap" && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="grid sm:grid-cols-2 gap-3">
            {DEALS.map((deal, i) => {
              const Icon = deal.icon;
              return (
                <motion.div
                  key={deal.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                  className={`group rounded-2xl border ${deal.border} ${deal.bg} backdrop-blur-sm p-4 transition-all duration-300 hover:shadow-[var(--shadow-soft)] hover:scale-[1.01]`}
                >
                  <div className="flex items-center gap-3 w-full">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${deal.bg} border ${deal.border} shrink-0`}>
                      <Icon className={`h-5 w-5 ${deal.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-xs truncate">{t(`rewardsPage.deals.${deal.id}.label`)}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{t(`rewardsPage.deals.${deal.id}.desc`, { coins: deal.coins, value: deal.value })}</p>
                    </div>
                    <Button
                      size="sm"
                      className="h-8 text-[11px] px-3 rounded-xl bg-[var(--eco-primary)] hover:bg-[var(--eco-best)] text-white shadow-sm hover:shadow-[var(--glow-green)] transition-all"
                      onClick={() => swapMutation.mutate(deal.id)} disabled={swapMutation.isPending}
                    >
                      {t("rewardsPage.redeem")}
                    </Button>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}

        {activeTab === "sell" && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <div className="rounded-2xl border border-border/60 bg-[var(--bg-glass)] backdrop-blur-xl p-4 shadow-[var(--shadow-soft)] space-y-3">
              <p className="font-semibold text-xs">{t("rewardsPage.sellTitle")}</p>
              <div className="grid sm:grid-cols-3 gap-2">
                {COMPANIES.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => setSellCompany(c.id)}
                    className={`p-3 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                      sellCompany === c.id
                        ? "border-[var(--eco-primary)] bg-[var(--eco-soft)]/20 dark:bg-[var(--eco-primary)]/10 shadow-sm"
                        : "border-border/50 hover:border-[var(--eco-primary)]/30"
                    }`}
                  >
                    <p className="font-semibold text-xs">{t(`rewardsPage.companies.${c.id}.name`)}</p>
                    <p className="text-[10px] text-muted-foreground">{t(`rewardsPage.companies.${c.id}.rate`)}</p>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-3 pt-1">
                <label className="text-xs font-semibold">{t("rewardsPage.coinsToSell")}</label>
                <input
                  type="number" min={1} value={sellCoins}
                  onChange={(e) => setSellCoins(+e.target.value)}
                  className="w-16 px-2 py-1 rounded-xl border border-border bg-background text-xs h-8 focus:ring-2 focus:ring-[var(--eco-primary)]/30 focus:border-[var(--eco-primary)] focus:outline-none transition-all"
                />
                <Button className="h-8 text-xs px-4 rounded-xl bg-[var(--eco-primary)] hover:bg-[var(--eco-best)] text-white shadow-sm" onClick={() => sellMutation.mutate()} disabled={sellMutation.isPending}>
                  {sellMutation.isPending ? t("rewardsPage.selling") : t("rewardsPage.sellCta")}
                </Button>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === "donate" && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <div className="rounded-2xl border border-border/60 bg-[var(--bg-glass)] backdrop-blur-xl p-4 shadow-[var(--shadow-soft)] space-y-3">
              <p className="font-semibold text-xs">{t("rewardsPage.donateTitle")}</p>
              <div className="space-y-2">
                {PROJECTS.map((p) => {
                  const Icon = p.icon;
                  return (
                    <div
                      key={p.id}
                      onClick={() => setDonateProject(p.id)}
                      className={`p-3 rounded-xl border-2 cursor-pointer flex items-center gap-3 transition-all duration-200 ${
                        donateProject === p.id
                          ? "border-[var(--eco-primary)] bg-[var(--eco-soft)]/20 dark:bg-[var(--eco-primary)]/10 shadow-sm"
                          : "border-border/50 hover:border-[var(--eco-primary)]/30"
                      }`}
                    >
                      <div className="w-9 h-9 rounded-xl bg-[var(--eco-soft)]/30 dark:bg-[var(--eco-primary)]/15 flex items-center justify-center shrink-0">
                        <Icon className="h-4.5 w-4.5 text-[var(--eco-primary)]" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-xs truncate">{t(`rewardsPage.projects.${p.id}.name`)}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{t(`rewardsPage.projects.${p.id}.desc`)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center gap-3 pt-1">
                <label className="text-xs font-semibold">{t("rewardsPage.coinsToDonate")}</label>
                <input
                  type="number" min={1} value={donateCoins}
                  onChange={(e) => setDonateCoins(+e.target.value)}
                  className="w-16 px-2 py-1 rounded-xl border border-border bg-background text-xs h-8 focus:ring-2 focus:ring-[var(--eco-primary)]/30 focus:border-[var(--eco-primary)] focus:outline-none transition-all"
                />
                <Button className="h-8 text-xs px-4 rounded-xl bg-[var(--eco-primary)] hover:bg-[var(--eco-best)] text-white shadow-sm" onClick={() => donateMutation.mutate()} disabled={donateMutation.isPending}>
                  {donateMutation.isPending ? t("rewardsPage.donating") : t("rewardsPage.donateCta")}
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </motion.div>

      {/* Transaction History */}
      {txns.length > 0 && (
        <motion.div variants={item} className="space-y-2">
          <h2 className="font-bold text-sm">{t("rewardsPage.txnHistory")}</h2>
          <div className="rounded-2xl border border-border/60 bg-[var(--bg-glass)] backdrop-blur-xl overflow-hidden shadow-[var(--shadow-soft)] divide-y divide-border/40">
            {txns.map((tx, i) => (
              <motion.div
                key={tx.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                className="flex items-center gap-3 p-3 hover:bg-muted/20 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-secondary/80 dark:bg-secondary/30 flex items-center justify-center shrink-0">
                  {txIcon(tx.transactionType)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold truncate leading-tight">{tx.description}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{new Date(tx.createdAt).toLocaleDateString()}</p>
                </div>
                <div className="text-right shrink-0 leading-tight">
                  <p className={`text-xs font-bold ${tx.coins > 0 ? "text-[var(--eco-primary)]" : "text-[var(--carbon-high)]"}`}>
                    {tx.coins > 0 ? "+" : ""}{tx.coins.toFixed(1)} {t("rewardsPage.ecoCoins")}
                  </p>
                  {(tx.money ?? 0) !== 0 && (
                    <p className="text-[10px] text-blue-600 mt-0.5">+₹{tx.money?.toFixed(0)}</p>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
