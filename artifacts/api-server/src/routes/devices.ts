import { Router, type IRouter } from "express";
import { eq, and, sum } from "drizzle-orm";
import { db, smartDevicesTable, autoOptimizationsTable, ecoWalletsTable, ecoTransactionsTable } from "@workspace/db";

const router: IRouter = Router();

// GET /devices - list user's devices
router.get("/devices", async (req, res): Promise<void> => {
  const sessionId = req.query.sessionId as string | undefined;
  if (!sessionId) { res.status(400).json({ error: "sessionId is required" }); return; }

  const devices = await db
    .select()
    .from(smartDevicesTable)
    .where(eq(smartDevicesTable.sessionId, sessionId));

  res.json(devices);
});

// POST /devices/connect - connect a smart device
router.post("/devices/connect", async (req, res): Promise<void> => {
  const { sessionId, deviceType, deviceBrand, deviceId, deviceName } = req.body;
  if (!sessionId || !deviceType || !deviceId) {
    res.status(400).json({ error: "sessionId, deviceType, and deviceId are required" });
    return;
  }

  const [device] = await db
    .insert(smartDevicesTable)
    .values({ sessionId, deviceType, deviceBrand, deviceId, deviceName, isConnected: true })
    .returning();

  res.status(201).json({ success: true, device });
});

// POST /devices/optimize - enable auto-optimization
router.post("/devices/optimize", async (req, res): Promise<void> => {
  const { sessionId, deviceId } = req.body;
  if (!sessionId || !deviceId) {
    res.status(400).json({ error: "sessionId and deviceId are required" });
    return;
  }

  const [device] = await db
    .update(smartDevicesTable)
    .set({ optimizationEnabled: true, updatedAt: new Date() })
    .where(and(eq(smartDevicesTable.id, deviceId), eq(smartDevicesTable.sessionId, sessionId)))
    .returning();

  if (!device) { res.status(404).json({ error: "Device not found" }); return; }

  // Simulate an initial optimization event
  const co2SavedKg = device.deviceType === "AC" ? 0.42 : device.deviceType === "light" ? 0.14 : 0.22;
  const energySavedKwh = co2SavedKg / 0.233;
  const moneySaved = energySavedKwh * 7.5;

  await db.insert(autoOptimizationsTable).values({
    deviceId: device.id,
    optimizationType: "initial",
    actualTime: new Date(),
    energySavedKwh,
    co2SavedKg,
    moneySaved,
  });

  // Award eco coins
  const coinsEarned = +(co2SavedKg / 10).toFixed(2);
  const existing = await db.select().from(ecoWalletsTable).where(eq(ecoWalletsTable.sessionId, sessionId));
  if (existing.length === 0) {
    await db.insert(ecoWalletsTable).values({ sessionId, coinBalance: coinsEarned, moneyBalance: 0 });
  } else {
    await db.update(ecoWalletsTable)
      .set({ coinBalance: existing[0].coinBalance + coinsEarned, updatedAt: new Date() })
      .where(eq(ecoWalletsTable.sessionId, sessionId));
  }

  await db.insert(ecoTransactionsTable).values({
    sessionId,
    transactionType: "earn",
    coins: coinsEarned,
    description: `Auto-optimization: ${device.deviceName ?? device.deviceType}`,
  });

  res.json({ success: true, message: "Auto-optimization enabled", coinsEarned });
});

// GET /savings - passive savings summary
router.get("/savings", async (req, res): Promise<void> => {
  const sessionId = req.query.sessionId as string | undefined;
  if (!sessionId) { res.status(400).json({ error: "sessionId is required" }); return; }

  const devices = await db.select({ id: smartDevicesTable.id })
    .from(smartDevicesTable)
    .where(eq(smartDevicesTable.sessionId, sessionId));

  if (devices.length === 0) {
    res.json({ co2Kg: 0, money: 0, energyKwh: 0 });
    return;
  }

  const deviceIds = devices.map((d) => d.id);

  let co2Kg = 0, money = 0, energyKwh = 0;
  for (const did of deviceIds) {
    const rows = await db.select().from(autoOptimizationsTable).where(eq(autoOptimizationsTable.deviceId, did));
    for (const r of rows) {
      co2Kg += r.co2SavedKg ?? 0;
      money += r.moneySaved ?? 0;
      energyKwh += r.energySavedKwh ?? 0;
    }
  }

  res.json({ co2Kg: +co2Kg.toFixed(2), money: +money.toFixed(2), energyKwh: +energyKwh.toFixed(2) });
});

// POST /savings/track - record an optimization event
router.post("/savings/track", async (req, res): Promise<void> => {
  const { sessionId, deviceId, optimizationType, energySavedKwh, co2SavedKg, moneySaved } = req.body;
  if (!sessionId || !deviceId) { res.status(400).json({ error: "sessionId and deviceId are required" }); return; }

  await db.insert(autoOptimizationsTable).values({
    deviceId,
    optimizationType: optimizationType ?? "auto",
    actualTime: new Date(),
    energySavedKwh: energySavedKwh ?? 0,
    co2SavedKg: co2SavedKg ?? 0,
    moneySaved: moneySaved ?? 0,
  });

  const coinsEarned = +((co2SavedKg ?? 0) / 10).toFixed(2);
  const existing = await db.select().from(ecoWalletsTable).where(eq(ecoWalletsTable.sessionId, sessionId));
  let newBalance = coinsEarned;
  if (existing.length === 0) {
    await db.insert(ecoWalletsTable).values({ sessionId, coinBalance: coinsEarned, moneyBalance: 0 });
  } else {
    newBalance = existing[0].coinBalance + coinsEarned;
    await db.update(ecoWalletsTable)
      .set({ coinBalance: newBalance, updatedAt: new Date() })
      .where(eq(ecoWalletsTable.sessionId, sessionId));
  }

  if (coinsEarned > 0) {
    await db.insert(ecoTransactionsTable).values({
      sessionId,
      transactionType: "earn",
      coins: coinsEarned,
      description: `Auto-track: ${optimizationType ?? "optimization"}`,
    });
  }

  res.json({ success: true, coinsEarned, newBalance });
});

export default router;
