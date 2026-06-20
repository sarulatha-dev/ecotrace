import { Router, type IRouter } from "express";
import { eq, and, sql, gte, lte } from "drizzle-orm";
import { db, phoneUsageTable, treePlantsTable, treePlantDonationsTable, passiveRewardsTable, ecoWalletsTable } from "@workspace/db";

const router: IRouter = Router();

const LOCATIONS = ["Kerala Forest", "Tamil Nadu Hills", "Uttarakhand Reserve", "Western Ghats", "Sundarbans Delta"];
const PROJECTS  = ["Plant 1000 Trees Initiative", "Green India Mission", "Carbon Neutral 2030", "Urban Canopy Project"];

function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function today(): string { return new Date().toISOString().split("T")[0]; }

// ── POST /api/phone/track ────────────────────────────────────────────────────
router.post("/phone/track", async (req, res): Promise<void> => {
  const { sessionId, screen_time_hours = 0, app_usage_hours = 0, battery_drain_mah = 0 } = req.body ?? {};
  if (!sessionId) { res.status(400).json({ error: "sessionId required" }); return; }

  const screenH = Math.max(0, Number(screen_time_hours) || 0);
  const appH    = Math.max(0, Number(app_usage_hours)   || 0);
  const battH   = Math.max(0, Number(battery_drain_mah) || 0);

  const co2Kg = +(screenH * 0.01 + appH * 0.005).toFixed(4);

  // Insert usage record
  const [usageRow] = await db.insert(phoneUsageTable).values({
    sessionId, usageDate: today(),
    screenTimeHours: screenH, appUsageHours: appH,
    batteryDrainMah: battH, co2Kg,
  }).returning();

  // 1 tree per 2 hours of screen time (makes demo satisfying)
  const treesEarned = screenH / 2;
  const treesToPlant = Math.floor(treesEarned);

  let treePlantRow = null;
  if (treesToPlant >= 1) {
    const co2Offset = +(treesToPlant * 0.01).toFixed(4);
    const location    = pick(LOCATIONS);
    const projectName = pick(PROJECTS);

    [treePlantRow] = await db.insert(treePlantsTable).values({
      sessionId, plantDate: today(),
      treesPlanted: treesToPlant, co2OffsetKg: co2Offset,
      location, projectName, isVerified: true,
    }).returning();

    await db.insert(treePlantDonationsTable).values({
      sessionId, treePlantId: treePlantRow.id,
      screenTimeHours: screenH, treesEarned,
    });

    // Coins: 1 tree = 10 coins
    const coinsToAdd = treesToPlant * 10;
    const existing = await db.select().from(ecoWalletsTable).where(eq(ecoWalletsTable.sessionId, sessionId));
    if (existing.length > 0) {
      await db.update(ecoWalletsTable)
        .set({ coinBalance: existing[0].coinBalance + coinsToAdd })
        .where(eq(ecoWalletsTable.sessionId, sessionId));
    } else {
      await db.insert(ecoWalletsTable).values({ sessionId, coinBalance: coinsToAdd, moneyBalance: 0 });
    }

    // Auto-create passive reward for >= 5 trees
    if (treesToPlant >= 5) {
      await db.insert(passiveRewardsTable).values({
        sessionId,
        rewardType: "coin",
        rewardValue: 50,
        rewardDate: today(),
        isClaimed: false,
      });
    }
  }

  res.json({
    success: true,
    co2_kg: co2Kg,
    trees_earned: treesEarned,
    trees_planted: treesToPlant,
    total_trees: treePlantRow?.treesPlanted ?? 0,
    location: treePlantRow?.location ?? null,
  });
});

// ── GET /api/phone/usage ─────────────────────────────────────────────────────
router.get("/phone/usage", async (req, res): Promise<void> => {
  const sessionId = req.query.sessionId as string | undefined;
  if (!sessionId) { res.status(400).json({ error: "sessionId required" }); return; }

  const rows = await db.select().from(phoneUsageTable).where(eq(phoneUsageTable.sessionId, sessionId));
  const totalScreenHours = rows.reduce((s, r) => s + r.screenTimeHours, 0);
  const totalAppHours    = rows.reduce((s, r) => s + r.appUsageHours, 0);
  const totalCo2Kg       = rows.reduce((s, r) => s + r.co2Kg, 0);

  const plants = await db.select().from(treePlantsTable).where(eq(treePlantsTable.sessionId, sessionId));
  const totalTreesPlanted = plants.reduce((s, r) => s + r.treesPlanted, 0);

  res.json({ screen_hours: +totalScreenHours.toFixed(2), app_hours: +totalAppHours.toFixed(2), co2_kg: +totalCo2Kg.toFixed(4), trees_planted: totalTreesPlanted });
});

// ── GET /api/trees ───────────────────────────────────────────────────────────
router.get("/trees", async (req, res): Promise<void> => {
  const sessionId = req.query.sessionId as string | undefined;
  if (!sessionId) { res.status(400).json({ error: "sessionId required" }); return; }
  const rows = await db.select().from(treePlantsTable)
    .where(eq(treePlantsTable.sessionId, sessionId))
    .orderBy(sql`${treePlantsTable.createdAt} DESC`);
  res.json(rows);
});

// ── POST /api/trees/plant ────────────────────────────────────────────────────
router.post("/trees/plant", async (req, res): Promise<void> => {
  const { sessionId, co2_kg, project_name, location } = req.body ?? {};
  if (!sessionId || !co2_kg) { res.status(400).json({ error: "sessionId and co2_kg required" }); return; }

  const treesToPlant = Math.max(1, Math.floor(Number(co2_kg) / 0.1));
  const co2Offset    = +(treesToPlant * 0.01).toFixed(4);
  const loc          = location    ?? pick(LOCATIONS);
  const proj         = project_name ?? pick(PROJECTS);

  const [row] = await db.insert(treePlantsTable).values({
    sessionId, plantDate: today(),
    treesPlanted: treesToPlant, co2OffsetKg: co2Offset,
    location: loc, projectName: proj, isVerified: true,
  }).returning();

  res.json({ success: true, trees_planted: treesToPlant, cost: treesToPlant * 5, location: loc, project_name: proj });
});

// ── GET /api/trees/map ───────────────────────────────────────────────────────
router.get("/trees/map", async (req, res): Promise<void> => {
  const rows = await db.select().from(treePlantsTable);
  const byLocation: Record<string, { totalTrees: number; totalCo2: number }> = {};
  for (const r of rows) {
    if (!byLocation[r.location]) byLocation[r.location] = { totalTrees: 0, totalCo2: 0 };
    byLocation[r.location].totalTrees += r.treesPlanted;
    byLocation[r.location].totalCo2  += r.co2OffsetKg;
  }
  const result = Object.entries(byLocation).map(([location, v]) => ({
    location, totalTrees: v.totalTrees, totalCo2: +v.totalCo2.toFixed(4),
  })).sort((a, b) => b.totalTrees - a.totalTrees);
  res.json(result);
});

// ── POST /api/rewards/claim ──────────────────────────────────────────────────
router.post("/rewards/claim", async (req, res): Promise<void> => {
  const { sessionId, reward_id } = req.body ?? {};
  if (!sessionId || !reward_id) { res.status(400).json({ error: "sessionId and reward_id required" }); return; }

  const [reward] = await db.select().from(passiveRewardsTable)
    .where(and(eq(passiveRewardsTable.id, Number(reward_id)), eq(passiveRewardsTable.sessionId, sessionId)));

  if (!reward) { res.status(404).json({ error: "Reward not found" }); return; }
  if (reward.isClaimed) { res.status(400).json({ error: "Already claimed" }); return; }

  if (reward.rewardType === "coin") {
    const existing = await db.select().from(ecoWalletsTable).where(eq(ecoWalletsTable.sessionId, sessionId));
    if (existing.length > 0) {
      await db.update(ecoWalletsTable)
        .set({ coinBalance: existing[0].coinBalance + reward.rewardValue })
        .where(eq(ecoWalletsTable.sessionId, sessionId));
    } else {
      await db.insert(ecoWalletsTable).values({ sessionId, coinBalance: reward.rewardValue, moneyBalance: 0 });
    }
  } else if (reward.rewardType === "tree") {
    await db.insert(treePlantsTable).values({
      sessionId, plantDate: today(),
      treesPlanted: Math.floor(reward.rewardValue), co2OffsetKg: +(reward.rewardValue * 0.01).toFixed(4),
      location: pick(LOCATIONS), projectName: pick(PROJECTS), isVerified: true,
    });
  }

  await db.update(passiveRewardsTable).set({ isClaimed: true }).where(eq(passiveRewardsTable.id, reward.id));

  res.json({ success: true, reward_type: reward.rewardType, reward_value: reward.rewardValue });
});

// ── GET /api/passive/summary ─────────────────────────────────────────────────
router.get("/passive/summary", async (req, res): Promise<void> => {
  const sessionId = req.query.sessionId as string | undefined;
  if (!sessionId) { res.status(400).json({ error: "sessionId required" }); return; }

  const [usage, plants, rewards, wallet] = await Promise.all([
    db.select().from(phoneUsageTable).where(eq(phoneUsageTable.sessionId, sessionId)),
    db.select().from(treePlantsTable).where(eq(treePlantsTable.sessionId, sessionId)),
    db.select().from(passiveRewardsTable).where(and(eq(passiveRewardsTable.sessionId, sessionId), eq(passiveRewardsTable.isClaimed, true), eq(passiveRewardsTable.rewardType, "coin"))),
    db.select().from(ecoWalletsTable).where(eq(ecoWalletsTable.sessionId, sessionId)),
  ]);

  res.json({
    total_screen_hours: +usage.reduce((s, r) => s + r.screenTimeHours, 0).toFixed(2),
    total_co2_kg:       +usage.reduce((s, r) => s + r.co2Kg, 0).toFixed(4),
    total_trees_planted: plants.reduce((s, r) => s + r.treesPlanted, 0),
    total_co2_offset:   +plants.reduce((s, r) => s + r.co2OffsetKg, 0).toFixed(4),
    coins_earned:       wallet[0]?.coinBalance ?? 0,
    unclaimed_rewards:  0,
  });
});

// ── GET /api/passive/rewards ─────────────────────────────────────────────────
router.get("/passive/rewards", async (req, res): Promise<void> => {
  const sessionId = req.query.sessionId as string | undefined;
  if (!sessionId) { res.status(400).json({ error: "sessionId required" }); return; }
  const rows = await db.select().from(passiveRewardsTable)
    .where(eq(passiveRewardsTable.sessionId, sessionId))
    .orderBy(sql`${passiveRewardsTable.createdAt} DESC`);
  res.json(rows);
});

export default router;
