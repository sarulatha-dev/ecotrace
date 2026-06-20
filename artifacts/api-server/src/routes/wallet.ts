import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, ecoWalletsTable, ecoTransactionsTable, ecoSubscriptionsTable, smartDevicesTable } from "@workspace/db";

const router: IRouter = Router();

// GET /wallet
router.get("/wallet", async (req, res): Promise<void> => {
  const sessionId = req.query.sessionId as string | undefined;
  if (!sessionId) { res.status(400).json({ error: "sessionId is required" }); return; }

  const existing = await db.select().from(ecoWalletsTable).where(eq(ecoWalletsTable.sessionId, sessionId));
  if (existing.length === 0) {
    const [wallet] = await db.insert(ecoWalletsTable)
      .values({ sessionId, coinBalance: 0, moneyBalance: 0 })
      .returning();
    res.json(wallet);
    return;
  }
  res.json(existing[0]);
});

// GET /wallet/transactions
router.get("/wallet/transactions", async (req, res): Promise<void> => {
  const sessionId = req.query.sessionId as string | undefined;
  if (!sessionId) { res.status(400).json({ error: "sessionId is required" }); return; }

  const txns = await db.select()
    .from(ecoTransactionsTable)
    .where(eq(ecoTransactionsTable.sessionId, sessionId))
    .orderBy(desc(ecoTransactionsTable.createdAt))
    .limit(20);

  res.json(txns);
});

// POST /wallet/earn - seed coins directly (demo)
router.post("/wallet/earn", async (req, res): Promise<void> => {
  const { sessionId, coins, description } = req.body;
  if (!sessionId || !coins) { res.status(400).json({ error: "sessionId and coins are required" }); return; }

  const existing = await db.select().from(ecoWalletsTable).where(eq(ecoWalletsTable.sessionId, sessionId));
  let newBalance = +coins;
  if (existing.length === 0) {
    await db.insert(ecoWalletsTable).values({ sessionId, coinBalance: +coins, moneyBalance: 0 });
  } else {
    newBalance = existing[0].coinBalance + +coins;
    await db.update(ecoWalletsTable).set({ coinBalance: newBalance, updatedAt: new Date() })
      .where(eq(ecoWalletsTable.sessionId, sessionId));
  }

  await db.insert(ecoTransactionsTable).values({
    sessionId, transactionType: "earn", coins: +coins,
    description: description ?? "Passive eco savings",
  });

  res.json({ success: true, newBalance });
});

const STORE_DEALS: Record<string, { name: string; coinsRequired: number; discountValue: number; store: string }> = {
  coffee: { name: "Free Coffee", coinsRequired: 10, discountValue: 150, store: "Café Day" },
  uber: { name: "₹100 Uber Ride", coinsRequired: 15, discountValue: 100, store: "Uber" },
  amazon: { name: "₹200 Amazon Voucher", coinsRequired: 20, discountValue: 200, store: "Amazon" },
  grocery: { name: "10% Grocery Discount", coinsRequired: 8, discountValue: 120, store: "BigBasket" },
};

// POST /wallet/swap
router.post("/wallet/swap", async (req, res): Promise<void> => {
  const { sessionId, dealId } = req.body;
  if (!sessionId || !dealId) { res.status(400).json({ error: "sessionId and dealId are required" }); return; }

  const deal = STORE_DEALS[dealId];
  if (!deal) { res.status(404).json({ error: "Deal not found" }); return; }

  const existing = await db.select().from(ecoWalletsTable).where(eq(ecoWalletsTable.sessionId, sessionId));
  if (existing.length === 0 || existing[0].coinBalance < deal.coinsRequired) {
    res.status(400).json({ error: "Insufficient coins" });
    return;
  }

  const newBalance = existing[0].coinBalance - deal.coinsRequired;
  await db.update(ecoWalletsTable).set({ coinBalance: newBalance, updatedAt: new Date() })
    .where(eq(ecoWalletsTable.sessionId, sessionId));

  await db.insert(ecoTransactionsTable).values({
    sessionId, transactionType: "swap",
    coins: -deal.coinsRequired, money: deal.discountValue,
    description: `Swapped for ${deal.name} at ${deal.store}`,
  });

  const qrCode = `QR-${sessionId.slice(0, 8)}-${dealId}-${Date.now()}`;
  res.json({ success: true, discount: deal.discountValue, dealName: deal.name, qrCode, newBalance });
});

const COMPANY_OFFERS: Record<string, { name: string; coinsPerUnit: number; pricePerUnit: number }> = {
  ola: { name: "Ola Electric", coinsPerUnit: 10, pricePerUnit: 44 },
  tata: { name: "Tata Power", coinsPerUnit: 10, pricePerUnit: 52 },
  mahindra: { name: "Mahindra Green", coinsPerUnit: 10, pricePerUnit: 48 },
};

// POST /wallet/sell
router.post("/wallet/sell", async (req, res): Promise<void> => {
  const { sessionId, companyId, coinsToSell } = req.body;
  if (!sessionId || !companyId || !coinsToSell) {
    res.status(400).json({ error: "sessionId, companyId and coinsToSell are required" });
    return;
  }

  const offer = COMPANY_OFFERS[companyId];
  if (!offer) { res.status(404).json({ error: "Company not found" }); return; }

  const existing = await db.select().from(ecoWalletsTable).where(eq(ecoWalletsTable.sessionId, sessionId));
  if (existing.length === 0 || existing[0].coinBalance < coinsToSell) {
    res.status(400).json({ error: "Insufficient coins" });
    return;
  }

  const moneyEarned = +((coinsToSell / offer.coinsPerUnit) * offer.pricePerUnit).toFixed(2);
  const newCoinBalance = existing[0].coinBalance - coinsToSell;
  const newMoneyBalance = existing[0].moneyBalance + moneyEarned;

  await db.update(ecoWalletsTable)
    .set({ coinBalance: newCoinBalance, moneyBalance: newMoneyBalance, updatedAt: new Date() })
    .where(eq(ecoWalletsTable.sessionId, sessionId));

  await db.insert(ecoTransactionsTable).values({
    sessionId, transactionType: "sell",
    coins: -coinsToSell, money: moneyEarned,
    description: `Sold to ${offer.name}`,
  });

  res.json({ success: true, moneyEarned, newCoinBalance, newMoneyBalance });
});

const ECO_PROJECTS: Record<string, { name: string; description: string }> = {
  mangrove: { name: "Mangrove Restoration", description: "Plant mangroves in coastal Tamil Nadu" },
  solar: { name: "Rural Solar Access", description: "Solar panels for 500 rural homes" },
  clean_water: { name: "Clean Water Initiative", description: "Rainwater harvesting for Chennai villages" },
};

// POST /wallet/donate
router.post("/wallet/donate", async (req, res): Promise<void> => {
  const { sessionId, projectId, coinsDonated } = req.body;
  if (!sessionId || !projectId || !coinsDonated) {
    res.status(400).json({ error: "sessionId, projectId and coinsDonated are required" });
    return;
  }

  const project = ECO_PROJECTS[projectId];
  if (!project) { res.status(404).json({ error: "Project not found" }); return; }

  const existing = await db.select().from(ecoWalletsTable).where(eq(ecoWalletsTable.sessionId, sessionId));
  if (existing.length === 0 || existing[0].coinBalance < coinsDonated) {
    res.status(400).json({ error: "Insufficient coins" });
    return;
  }

  const newBalance = existing[0].coinBalance - coinsDonated;
  await db.update(ecoWalletsTable).set({ coinBalance: newBalance, updatedAt: new Date() })
    .where(eq(ecoWalletsTable.sessionId, sessionId));

  await db.insert(ecoTransactionsTable).values({
    sessionId, transactionType: "donate",
    coins: -coinsDonated,
    description: `Donated to ${project.name}`,
  });

  res.json({ success: true, newBalance, projectName: project.name });
});

// POST /subscribe
router.post("/subscribe", async (req, res): Promise<void> => {
  const { sessionId, bundleType } = req.body;
  if (!sessionId) { res.status(400).json({ error: "sessionId is required" }); return; }

  const [sub] = await db.insert(ecoSubscriptionsTable).values({
    sessionId,
    bundleType: bundleType ?? "eco_home_bundle",
    monthlyCost: 999,
    moneyPaid: 999,
    status: "active",
  }).returning();

  // Enable optimization on all devices
  await db.update(smartDevicesTable)
    .set({ optimizationEnabled: true, updatedAt: new Date() })
    .where(eq(smartDevicesTable.sessionId, sessionId));

  res.json({ success: true, message: "Subscribed to Eco Home Bundle", monthlyCost: 999, subscription: sub });
});

// GET /subscription/status
router.get("/subscription/status", async (req, res): Promise<void> => {
  const sessionId = req.query.sessionId as string | undefined;
  if (!sessionId) { res.status(400).json({ error: "sessionId is required" }); return; }

  const subs = await db.select().from(ecoSubscriptionsTable)
    .where(eq(ecoSubscriptionsTable.sessionId, sessionId))
    .limit(1);

  res.json({ subscribed: subs.length > 0 && subs[0].status === "active", subscription: subs[0] ?? null });
});

// GET /loyalty
router.get("/loyalty", async (req, res): Promise<void> => {
  const sessionId = req.query.sessionId as string | undefined;
  if (!sessionId) { res.status(400).json({ error: "sessionId is required" }); return; }

  const wallet = await db.select().from(ecoWalletsTable).where(eq(ecoWalletsTable.sessionId, sessionId));
  const coins = wallet.length > 0 ? wallet[0].coinBalance : 0;

  const levels = [
    { name: "Eco Beginner", min: 0, max: 100, rewardsMonthly: 100, next: "Eco Smart" },
    { name: "Eco Smart", min: 100, max: 300, rewardsMonthly: 300, next: "Eco Pro" },
    { name: "Eco Pro", min: 300, max: 500, rewardsMonthly: 500, next: "Eco Legend" },
    { name: "Eco Legend", min: 500, max: Infinity, rewardsMonthly: 1000, next: null },
  ];

  const level = levels.find((l) => coins >= l.min && coins < l.max) ?? levels[0];
  const progress = level.max === Infinity ? 100 : Math.min(100, Math.round(((coins - level.min) / (level.max - level.min)) * 100));

  res.json({
    level: level.name,
    rewardsMonthly: level.rewardsMonthly,
    nextLevel: level.next,
    progress,
    coins,
    nextLevelCoins: level.max === Infinity ? null : level.max,
  });
});

// GET /neighborhood
router.get("/neighborhood", async (req, res): Promise<void> => {
  res.json({
    neighborhood: "T. Nagar, Chennai",
    totalHomes: 45,
    totalCo2Saved: 18420,
    totalMoneySaved: 27630,
    rank: 3,
    totalNeighborhoods: 128,
  });
});

export default router;
