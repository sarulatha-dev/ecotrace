import { Router, type IRouter } from "express";
import { eq, and, gte, desc } from "drizzle-orm";
import { db, activitiesTable } from "@workspace/db";
import {
  ListActivitiesQueryParams,
  CreateActivityBody,
  DeleteActivityParams,
  GetActivitySummaryQueryParams,
} from "@workspace/api-zod";
import { calculateCo2, getActivityDef, GLOBAL_DAILY_AVERAGE_KG } from "../lib/carbon-factors";

const router: IRouter = Router();

router.get("/activities/summary", async (req, res): Promise<void> => {
  const parsed = GetActivitySummaryQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { sessionId, days = 7 } = parsed.data;
  const since = new Date();
  since.setDate(since.getDate() - days);

  const activities = await db
    .select()
    .from(activitiesTable)
    .where(
      and(
        eq(activitiesTable.sessionId, sessionId),
        gte(activitiesTable.loggedAt, since)
      )
    )
    .orderBy(desc(activitiesTable.loggedAt));

  const totalCo2 = activities.reduce((sum, a) => sum + a.co2Amount, 0);

  const categoryMap: Record<string, number> = {};
  for (const activity of activities) {
    categoryMap[activity.category] = (categoryMap[activity.category] ?? 0) + activity.co2Amount;
  }

  const byCategory = Object.entries(categoryMap).map(([category, co2Amount]) => ({
    category,
    co2Amount: Math.round(co2Amount * 100) / 100,
    percentage: totalCo2 > 0 ? Math.round((co2Amount / totalCo2) * 1000) / 10 : 0,
  }));

  const dailyAverage = days > 0 ? Math.round((totalCo2 / days) * 100) / 100 : 0;

  const dailyMap: Record<string, number> = {};
  for (let i = 0; i < days; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split("T")[0];
    dailyMap[key] = 0;
  }
  for (const activity of activities) {
    const key = activity.loggedAt.toISOString().split("T")[0];
    if (key in dailyMap) {
      dailyMap[key] = (dailyMap[key] ?? 0) + activity.co2Amount;
    }
  }
  const weeklyData = Object.entries(dailyMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, co2Amount]) => ({
      date,
      co2Amount: Math.round(co2Amount * 100) / 100,
    }));

  const treeEquivalent = Math.round((totalCo2 / 21.77) * 100) / 100;
  const flightHoursEquivalent = Math.round((totalCo2 / 90) * 100) / 100;

  res.json({
    totalCo2: Math.round(totalCo2 * 100) / 100,
    byCategory,
    dailyAverage,
    globalAverage: GLOBAL_DAILY_AVERAGE_KG,
    treeEquivalent,
    flightHoursEquivalent,
    weeklyData,
  });
});

router.get("/activities", async (req, res): Promise<void> => {
  const parsed = ListActivitiesQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { sessionId, days } = parsed.data;

  let whereClause;
  if (days && days > 0) {
    const since = new Date();
    since.setDate(since.getDate() - days);
    whereClause = and(
      eq(activitiesTable.sessionId, sessionId),
      gte(activitiesTable.loggedAt, since)
    );
  } else {
    whereClause = eq(activitiesTable.sessionId, sessionId);
  }

  const activities = await db
    .select()
    .from(activitiesTable)
    .where(whereClause)
    .orderBy(desc(activitiesTable.loggedAt));

  res.json(
    activities.map((a) => ({
      ...a,
      loggedAt: a.loggedAt.toISOString(),
    }))
  );
});

router.post("/activities", async (req, res): Promise<void> => {
  const parsed = CreateActivityBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { sessionId, category, activityType, value } = parsed.data;

  const def = getActivityDef(category, activityType);
  if (!def) {
    res.status(400).json({ error: `Unknown activity type: ${activityType}` });
    return;
  }

  const co2Amount = calculateCo2(category, activityType, value);
  if (co2Amount === null) {
    res.status(400).json({ error: "Could not calculate CO2 for this activity" });
    return;
  }

  const [activity] = await db
    .insert(activitiesTable)
    .values({
      sessionId,
      category,
      activityType,
      activityLabel: def.label,
      value,
      unit: def.unit,
      co2Amount,
    })
    .returning();

  res.status(201).json({
    ...activity,
    loggedAt: activity.loggedAt.toISOString(),
  });
});

router.delete("/activities/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = DeleteActivityParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [deleted] = await db
    .delete(activitiesTable)
    .where(eq(activitiesTable.id, params.data.id))
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "Activity not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
