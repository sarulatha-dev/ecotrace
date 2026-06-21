import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, challengesTable, challengeCompletionsTable } from "@workspace/db";
import {
  CompleteChallengeParams,
  CompleteChallengeBody,
  ListChallengeCompletionsQueryParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

const DEFAULT_CHALLENGES = [
  {
    title: "Meatless Mondays",
    description: "Skip meat for one day a week and discover delicious vegetarian alternatives to lower your food carbon footprint.",
    category: "food",
    co2Reduction: 8.5,
    icon: "Utensils",
    difficulty: "easy"
  },
  {
    title: "Carpooling Comrade",
    description: "Share a ride with coworkers or friends to work/school instead of driving alone.",
    category: "transport",
    co2Reduction: 15.0,
    icon: "Users",
    difficulty: "easy"
  },
  {
    title: "Thermostat Turn-down",
    description: "Lower your thermostat by 2°C (or raise it for AC) for a week to save heating/cooling energy.",
    category: "energy",
    co2Reduction: 12.0,
    icon: "Thermometer",
    difficulty: "easy"
  },
  {
    title: "Public Transit Commuter",
    description: "Take the bus, train, or metro to commute instead of driving your personal vehicle.",
    category: "transport",
    co2Reduction: 25.0,
    icon: "Train",
    difficulty: "medium"
  },
  {
    title: "Unplug Standby Devices",
    description: "Unplug all chargers, TVs, and computers when not in use to eliminate phantom/standby power usage.",
    category: "energy",
    co2Reduction: 5.0,
    icon: "Zap",
    difficulty: "easy"
  },
  {
    title: "Secondhand September",
    description: "Commit to buying only secondhand items (clothing, furniture, books) rather than new products.",
    category: "shopping",
    co2Reduction: 18.0,
    icon: "ShoppingBag",
    difficulty: "medium"
  },
  {
    title: "Cold Water Wash",
    description: "Wash all your laundry loads in cold water instead of hot or warm for the next month.",
    category: "energy",
    co2Reduction: 6.0,
    icon: "Droplet",
    difficulty: "easy"
  },
  {
    title: "Zero Waste Cooking",
    description: "Create a meal entirely using leftover ingredients in your fridge to prevent carbon emissions from food waste.",
    category: "food",
    co2Reduction: 10.0,
    icon: "Leaf",
    difficulty: "medium"
  },
  {
    title: "Biking to Errands",
    description: "Ride a bicycle or walk for all trips/errands under 5 km this week.",
    category: "transport",
    co2Reduction: 14.5,
    icon: "Bike",
    difficulty: "medium"
  }
];

router.get("/challenges", async (_req, res): Promise<void> => {
  let challenges = await db.select().from(challengesTable);
  if (challenges.length === 0) {
    await db.insert(challengesTable).values(DEFAULT_CHALLENGES);
    challenges = await db.select().from(challengesTable);
  }
  res.json(challenges);
});

router.post("/challenges/:id/complete", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = CompleteChallengeParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = CompleteChallengeBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const { sessionId } = body.data;
  const { id } = params.data;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const existing = await db
    .select()
    .from(challengeCompletionsTable)
    .where(
      and(
        eq(challengeCompletionsTable.sessionId, sessionId),
        eq(challengeCompletionsTable.challengeId, id)
      )
    );

  const completedToday = existing.some((c) => {
    const completedDate = new Date(c.completedAt);
    return completedDate >= today && completedDate < tomorrow;
  });

  if (completedToday) {
    res.status(400).json({ error: "Challenge already completed today" });
    return;
  }

  const [completion] = await db
    .insert(challengeCompletionsTable)
    .values({ sessionId, challengeId: id })
    .returning();

  res.status(201).json({
    ...completion,
    completedAt: completion.completedAt.toISOString(),
  });
});

router.get("/challenges/completions", async (req, res): Promise<void> => {
  const parsed = ListChallengeCompletionsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { sessionId } = parsed.data;
  const completions = await db
    .select()
    .from(challengeCompletionsTable)
    .where(eq(challengeCompletionsTable.sessionId, sessionId));

  res.json(
    completions.map((c) => ({
      ...c,
      completedAt: c.completedAt.toISOString(),
    }))
  );
});

export default router;
