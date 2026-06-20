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
  Coins, DollarSign, ShoppingBag, TrendingUp, Heart, ArrowUp, ArrowDown,
  Leaf, Trophy, Star, Sparkles, Coffee, Car, ShoppingCart, Zap, Trees
} from "lucide-react";

const container = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0 } };

const DEALS = [
  { id: "coffee", label: "Free Coffee", store: "Café Day", coins: 10, value: 150, icon: Coffee, color: "bg-amber-100 text-amber-700" },
  { id: "uber", label: "₹100 Uber Ride", store: "Uber", coins: 15, value: 100, icon: Car, color: "bg-slate-100 text-slate-700" },
  { id: "amazon", label: "₹200 Voucher", store: "Amazon", coins: 20, value: 200, icon: ShoppingCart, color: "bg-orange-100 text-orange-700" },
  { id: "grocery", label: "10% Grocery Off", store: "BigBasket", coins: 8, value: 120, icon: ShoppingBag, color: "bg-green-100 text-green-700" },
];

const COMPANIES = [
  { id: "ola", name: "Ola Electric", rate: "10 coins = ₹44", color: "bg-yellow-100 text-yellow-700", defaultCoins: 10 },
  { id: "tata", name: "Tata Power", rate: "10 coins = ₹52", color: "bg-blue-100 text-blue-700", defaultCoins: 10 },
  { id: "mahindra", name: "Mahindra Green", rate: "10 coins = ₹48", color: "bg-emerald-100 text-emerald-700", defaultCoins: 10 },
];

const PROJECTS = [
  { id: "mangrove", name: "Mangrove Restoration", desc: "Plant mangroves in coastal Tamil Nadu", icon: Trees, defaultCoins: 5 },
  { id: "solar", name: "Rural Solar Access", desc: "Solar panels for 500 rural homes", icon: Zap, defaultCoins: 5 },
  { id: "clean_water", name: "Clean Water Initiative", desc: "Rainwater harvesting for Chennai", icon: Leaf, defaultCoins: 5 },
];

const LEVEL_COLORS: Record<string, string> = {
  "Eco Beginner": "from-slate-400 to-slate-600",
  "Eco Smart": "from-emerald-400 to-emerald-600",
  "Eco Pro": "from-blue-400 to-blue-600",
  "Eco Legend": "from-yellow-400 to-amber-600",
};

const txIcon = (type: string) => {
  if (type === "earn") return <ArrowUp className="h-4 w-4 text-emerald-500" />;
  if (type === "sell") return <DollarSign className="h-4 w-4 text-blue-500" />;
  if (type === "donate") return <Heart className="h-4 w-4 text-red-500" />;
  return <ShoppingBag className="h-4 w-4 text-orange-500" />;
};

export default function Rewards() {
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
    onSuccess: () => { invalidate(); toast({ title: "+25 Eco Coins earned!", description: "Simulated passive home savings." }); },
  });

  const swapMutation = useMutation({
    mutationFn: async (dealId: string) => {
      const r = await axios.post("/api/wallet/swap", { sessionId, dealId });
      return r.data;
    },
    onSuccess: (data) => { invalidate(); toast({ title: `Swapped! ₹${data.discount} discount`, description: `QR: ${data.qrCode}` }); },
    onError: () => toast({ title: "Not enough coins", variant: "destructive" }),
  });

  const sellMutation = useMutation({
    mutationFn: async () => {
      const r = await axios.post("/api/wallet/sell", { sessionId, companyId: sellCompany, coinsToSell: sellCoins });
      return r.data;
    },
    onSuccess: (data) => { invalidate(); toast({ title: `₹${data.moneyEarned} added to wallet!`, description: `Sold ${sellCoins} coins to ${COMPANIES.find(c => c.id === sellCompany)?.name}` }); },
    onError: () => toast({ title: "Not enough coins", variant: "destructive" }),
  });

  const donateMutation = useMutation({
    mutationFn: async () => {
      const r = await axios.post("/api/wallet/donate", { sessionId, projectId: donateProject, coinsDonated: donateCoins });
      return r.data;
    },
    onSuccess: (data) => { invalidate(); toast({ title: "Donated! 🌿", description: `Donated to ${PROJECTS.find(p => p.id === donateProject)?.name}` }); },
    onError: () => toast({ title: "Not enough coins", variant: "destructive" }),
  });

  const gradientClass = LEVEL_COLORS[loyalty?.level ?? "Eco Beginner"] ?? "from-slate-400 to-slate-600";

  return (
    <motion.div className="p-6 md:p-8 space-y-8 max-w-4xl mx-auto" variants={container} initial="hidden" animate="show">
      <div>
        <motion.h1 variants={item} className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Coins className="h-7 w-7 text-yellow-500" /> Auto Rewards
        </motion.h1>
        <motion.p variants={item} className="text-muted-foreground mt-1">
          Earn coins automatically from your eco savings, then swap, sell, or donate.
        </motion.p>
      </div>

      {/* Wallet cards */}
      <motion.div variants={item} className="grid sm:grid-cols-2 gap-4">
        <Card className="bg-gradient-to-br from-yellow-50 to-amber-50 dark:from-yellow-950/20 dark:to-amber-950/20 border-yellow-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Coins className="h-5 w-5 text-yellow-600" />
                <span className="font-semibold text-yellow-800 dark:text-yellow-300">Eco Coins</span>
              </div>
              <Badge className="bg-yellow-100 text-yellow-700 border-0 text-xs">Earn passively</Badge>
            </div>
            <p className="text-5xl font-bold text-yellow-700 dark:text-yellow-400">
              {loadingWallet ? "—" : wallet?.coinBalance.toFixed(1)}
            </p>
            <p className="text-sm text-yellow-600 dark:text-yellow-500 mt-1">coins available</p>
            <Button size="sm" variant="outline" className="mt-4 border-yellow-300" onClick={() => earnMutation.mutate()} disabled={earnMutation.isPending}>
              <Sparkles className="h-3.5 w-3.5 mr-1" />
              {earnMutation.isPending ? "Earning…" : "Simulate Passive Earn (+25)"}
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-3">
              <DollarSign className="h-5 w-5 text-blue-600" />
              <span className="font-semibold text-blue-800 dark:text-blue-300">Cash Balance</span>
            </div>
            <p className="text-5xl font-bold text-blue-700 dark:text-blue-400">
              ₹{loadingWallet ? "—" : wallet?.moneyBalance.toFixed(0)}
            </p>
            <p className="text-sm text-blue-600 dark:text-blue-500 mt-1">from selling coins</p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Loyalty Level */}
      {loyalty && (
        <motion.div variants={item}>
          <Card className="overflow-hidden shadow-sm">
            <div className={`h-1.5 w-full bg-gradient-to-r ${gradientClass}`} />
            <CardContent className="p-5">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${gradientClass} flex items-center justify-center`}>
                    <Trophy className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="font-bold">{loyalty.level}</p>
                    <p className="text-sm text-muted-foreground">₹{loyalty.rewardsMonthly}/month rewards</p>
                  </div>
                </div>
                {loyalty.nextLevel && (
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground mb-1">Next: {loyalty.nextLevel} at {loyalty.nextLevelCoins} coins</p>
                    <div className="w-48 h-2 bg-secondary rounded-full overflow-hidden">
                      <div className={`h-full bg-gradient-to-r ${gradientClass} rounded-full transition-all`} style={{ width: `${loyalty.progress}%` }} />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{loyalty.progress}% there</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Actions */}
      <motion.div variants={item} className="space-y-4">
        <div className="flex gap-2">
          {(["swap", "sell", "donate"] as const).map((tab) => (
            <Button key={tab} size="sm" variant={activeTab === tab ? "default" : "outline"} onClick={() => setActiveTab(tab)}>
              {tab === "swap" && <ShoppingBag className="h-3.5 w-3.5 mr-1" />}
              {tab === "sell" && <DollarSign className="h-3.5 w-3.5 mr-1" />}
              {tab === "donate" && <Heart className="h-3.5 w-3.5 mr-1" />}
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Button>
          ))}
        </div>

        {activeTab === "swap" && (
          <div className="grid sm:grid-cols-2 gap-3">
            {DEALS.map((deal) => {
              const Icon = deal.icon;
              return (
                <Card key={deal.id} className="shadow-sm">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${deal.color} shrink-0`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{deal.label}</p>
                      <p className="text-xs text-muted-foreground">{deal.store} · {deal.coins} coins → ₹{deal.value}</p>
                    </div>
                    <Button size="sm" onClick={() => swapMutation.mutate(deal.id)} disabled={swapMutation.isPending}>Swap</Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {activeTab === "sell" && (
          <Card className="shadow-sm">
            <CardContent className="p-5 space-y-4">
              <p className="font-medium">Sell coins to corporates offsetting their carbon</p>
              <div className="grid sm:grid-cols-3 gap-2">
                {COMPANIES.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => setSellCompany(c.id)}
                    className={`p-3 rounded-xl border-2 cursor-pointer transition-all ${sellCompany === c.id ? "border-primary bg-primary/5" : "border-border"}`}
                  >
                    <p className="font-medium text-sm">{c.name}</p>
                    <p className="text-xs text-muted-foreground">{c.rate}</p>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-3">
                <label className="text-sm font-medium">Coins to sell:</label>
                <input
                  type="number" min={1} value={sellCoins}
                  onChange={(e) => setSellCoins(+e.target.value)}
                  className="w-20 px-3 py-1.5 rounded-lg border border-border bg-background text-sm"
                />
                <Button onClick={() => sellMutation.mutate()} disabled={sellMutation.isPending}>
                  {sellMutation.isPending ? "Selling…" : "Sell Coins"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === "donate" && (
          <Card className="shadow-sm">
            <CardContent className="p-5 space-y-4">
              <p className="font-medium">Donate coins to climate projects</p>
              <div className="space-y-2">
                {PROJECTS.map((p) => {
                  const Icon = p.icon;
                  return (
                    <div
                      key={p.id}
                      onClick={() => setDonateProject(p.id)}
                      className={`p-3 rounded-xl border-2 cursor-pointer flex items-center gap-3 transition-all ${donateProject === p.id ? "border-primary bg-primary/5" : "border-border"}`}
                    >
                      <Icon className="h-5 w-5 text-primary shrink-0" />
                      <div>
                        <p className="font-medium text-sm">{p.name}</p>
                        <p className="text-xs text-muted-foreground">{p.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center gap-3">
                <label className="text-sm font-medium">Coins to donate:</label>
                <input
                  type="number" min={1} value={donateCoins}
                  onChange={(e) => setDonateCoins(+e.target.value)}
                  className="w-20 px-3 py-1.5 rounded-lg border border-border bg-background text-sm"
                />
                <Button onClick={() => donateMutation.mutate()} disabled={donateMutation.isPending}>
                  {donateMutation.isPending ? "Donating…" : "Donate"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </motion.div>

      {/* Transaction History */}
      {txns.length > 0 && (
        <motion.div variants={item} className="space-y-3">
          <h2 className="font-semibold text-lg">Transaction History</h2>
          <Card className="shadow-sm divide-y divide-border">
            {txns.map((tx) => (
              <div key={tx.id} className="flex items-center gap-3 p-3">
                <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center shrink-0">
                  {txIcon(tx.transactionType)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{tx.description}</p>
                  <p className="text-xs text-muted-foreground">{new Date(tx.createdAt).toLocaleDateString()}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className={`text-sm font-semibold ${tx.coins > 0 ? "text-emerald-600" : "text-red-500"}`}>
                    {tx.coins > 0 ? "+" : ""}{tx.coins.toFixed(1)} coins
                  </p>
                  {(tx.money ?? 0) !== 0 && (
                    <p className="text-xs text-blue-600">+₹{tx.money?.toFixed(0)}</p>
                  )}
                </div>
              </div>
            ))}
          </Card>
        </motion.div>
      )}
    </motion.div>
  );
}
