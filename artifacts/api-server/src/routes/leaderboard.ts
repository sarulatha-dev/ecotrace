import { Router, type IRouter } from "express";
import { db, challengeCompletionsTable, challengesTable, activitiesTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

const ADJECTIVES = [
  "Solar", "Verdant", "Leafy", "Mossy", "Breeze", "Tidal", "Alpine", "Misty",
  "Amber", "Birch", "Cedar", "Fern", "Grove", "Hazel", "Ivy", "Jade",
  "Kelp", "Linden", "Maple", "Nettle", "Olive", "Pine", "Quartz", "Reed",
];
const NOUNS = [
  "Fox", "Owl", "Deer", "Bear", "Wolf", "Hare", "Lynx", "Hawk",
  "Otter", "Crane", "Finch", "Robin", "Raven", "Wren", "Vole", "Mink",
  "Dace", "Kite", "Swift", "Egret", "Grouse", "Stoat", "Bison", "Moose",
];

function sessionToDisplayName(sessionId: string): string {
  let hash = 0;
  for (let i = 0; i < sessionId.length; i++) {
    hash = (Math.imul(31, hash) + sessionId.charCodeAt(i)) | 0;
  }
  const adj = ADJECTIVES[Math.abs(hash) % ADJECTIVES.length];
  const noun = NOUNS[Math.abs(hash >> 8) % NOUNS.length];
  const num = Math.abs(hash >> 16) % 100;
  return `${adj} ${noun} #${String(num).padStart(2, "0")}`;
}

router.get("/leaderboard", async (req, res): Promise<void> => {
  const currentSessionId = req.query.sessionId as string | undefined;

  const completions = await db.select().from(challengeCompletionsTable);
  const challenges = await db.select().from(challengesTable);
  const activities = await db.select().from(activitiesTable);

  const challengeMap = new Map(challenges.map((c) => [c.id, c]));

  const sessionStats: Map<string, {
    co2Reduced: number;
    challengesCompleted: number;
    totalCo2Logged: number;
    categoryCount: Record<string, number>;
  }> = new Map();

  for (const completion of completions) {
    const challenge = challengeMap.get(completion.challengeId);
    if (!challenge) continue;
    const existing = sessionStats.get(completion.sessionId) ?? {
      co2Reduced: 0,
      challengesCompleted: 0,
      totalCo2Logged: 0,
      categoryCount: {},
    };
    existing.co2Reduced += challenge.co2Reduction;
    existing.challengesCompleted += 1;
    existing.categoryCount[challenge.category] = (existing.categoryCount[challenge.category] ?? 0) + 1;
    sessionStats.set(completion.sessionId, existing);
  }

  for (const activity of activities) {
    const existing = sessionStats.get(activity.sessionId);
    if (existing) {
      existing.totalCo2Logged += activity.co2Amount;
    }
  }

  const entries = Array.from(sessionStats.entries())
    .filter(([, stats]) => stats.challengesCompleted > 0)
    .sort(([, a], [, b]) => b.co2Reduced - a.co2Reduced)
    .slice(0, 20)
    .map(([sessionId, stats], index) => {
      const topCategory = Object.entries(stats.categoryCount)
        .sort(([, a], [, b]) => b - a)[0]?.[0] ?? "transport";
      return {
        rank: index + 1,
        displayName: sessionToDisplayName(sessionId),
        co2Reduced: Math.round(stats.co2Reduced * 10) / 10,
        challengesCompleted: stats.challengesCompleted,
        totalCo2Logged: Math.round(stats.totalCo2Logged * 10) / 10,
        topCategory,
        isCurrentUser: sessionId === currentSessionId,
      };
    });

  if (currentSessionId && !entries.some((e) => e.isCurrentUser)) {
    const userStats = sessionStats.get(currentSessionId);
    if (!userStats || userStats.challengesCompleted === 0) {
      entries.push({
        rank: entries.length + 1,
        displayName: sessionToDisplayName(currentSessionId),
        co2Reduced: userStats?.co2Reduced ?? 0,
        challengesCompleted: userStats?.challengesCompleted ?? 0,
        totalCo2Logged: Math.round((userStats?.totalCo2Logged ?? 0) * 10) / 10,
        topCategory: "transport",
        isCurrentUser: true,
      });
    }
  }

  res.json(entries);
});

export default router;
