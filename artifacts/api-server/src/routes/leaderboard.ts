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

const MOCK_COMPETITORS = [
  { displayName: "Solar Fox #05", co2Reduced: 125.4, challengesCompleted: 8, totalCo2Logged: 320.5, topCategory: "energy", isCurrentUser: false },
  { displayName: "Verdant Owl #12", co2Reduced: 94.2, challengesCompleted: 6, totalCo2Logged: 210.8, topCategory: "food", isCurrentUser: false },
  { displayName: "Mossy Bear #22", co2Reduced: 78.5, challengesCompleted: 5, totalCo2Logged: 450.2, topCategory: "transport", isCurrentUser: false },
  { displayName: "Misty Hare #45", co2Reduced: 52.0, challengesCompleted: 4, totalCo2Logged: 180.0, topCategory: "shopping", isCurrentUser: false },
  { displayName: "Amber Lynx #17", co2Reduced: 38.2, challengesCompleted: 3, totalCo2Logged: 290.4, topCategory: "transport", isCurrentUser: false }
];

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
    const existing = sessionStats.get(activity.sessionId) ?? {
      co2Reduced: 0,
      challengesCompleted: 0,
      totalCo2Logged: 0,
      categoryCount: {},
    };
    existing.totalCo2Logged += activity.co2Amount;
    sessionStats.set(activity.sessionId, existing);
  }

  // Build real entries from DB session stats
  const realEntries = Array.from(sessionStats.entries())
    .map(([sessionId, stats]) => {
      const topCategory = Object.entries(stats.categoryCount)
        .sort(([, a], [, b]) => b - a)[0]?.[0] ?? "transport";
      return {
        displayName: sessionToDisplayName(sessionId),
        co2Reduced: Math.round(stats.co2Reduced * 10) / 10,
        challengesCompleted: stats.challengesCompleted,
        totalCo2Logged: Math.round(stats.totalCo2Logged * 10) / 10,
        topCategory,
        isCurrentUser: sessionId === currentSessionId,
      };
    });

  // Ensure current user is in realEntries even if not in sessionStats
  if (currentSessionId && !realEntries.some((e) => e.isCurrentUser)) {
    realEntries.push({
      displayName: sessionToDisplayName(currentSessionId),
      co2Reduced: 0,
      challengesCompleted: 0,
      totalCo2Logged: 0,
      topCategory: "transport",
      isCurrentUser: true,
    });
  }

  // Combine real entries and mock competitors
  const allEntries = [
    ...realEntries,
    ...MOCK_COMPETITORS.filter(
      (m) => !realEntries.some((r) => r.displayName === m.displayName)
    ),
  ];

  // Sort by co2Reduced descending
  const sorted = allEntries.sort((a, b) => b.co2Reduced - a.co2Reduced);

  // Assign ranks and slice top 20
  const entries = sorted.slice(0, 20).map((entry, index) => ({
    rank: index + 1,
    displayName: entry.displayName,
    co2Reduced: entry.co2Reduced,
    challengesCompleted: entry.challengesCompleted,
    totalCo2Logged: entry.totalCo2Logged,
    topCategory: entry.topCategory,
    isCurrentUser: entry.isCurrentUser,
  }));

  res.json(entries);
});

export default router;
