import { Router, type IRouter } from "express";
import { eq, and, gte, desc } from "drizzle-orm";
import { db, activitiesTable, challengeCompletionsTable, challengesTable } from "@workspace/db";
import { GetCoachAdviceBody } from "@workspace/api-zod";
import { openai } from "@workspace/integrations-openai-ai-server";
import { GLOBAL_DAILY_AVERAGE_KG } from "../lib/carbon-factors";

const router: IRouter = Router();

const CATEGORY_LABELS: Record<string, string> = {
  transport: "Transport",
  food: "Food & Diet",
  energy: "Home Energy",
  shopping: "Shopping & Goods",
};

router.post("/coach/advice", async (req, res): Promise<void> => {
  const parsed = GetCoachAdviceBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { sessionId } = parsed.data;

  const since = new Date();
  since.setDate(since.getDate() - 30);

  const [activities, completions, challenges] = await Promise.all([
    db
      .select()
      .from(activitiesTable)
      .where(and(eq(activitiesTable.sessionId, sessionId), gte(activitiesTable.loggedAt, since)))
      .orderBy(desc(activitiesTable.loggedAt))
      .limit(50),
    db
      .select()
      .from(challengeCompletionsTable)
      .where(eq(challengeCompletionsTable.sessionId, sessionId)),
    db.select().from(challengesTable),
  ]);

  const totalCo2 = activities.reduce((s, a) => s + a.co2Amount, 0);
  const days = Math.max(1, Math.ceil((Date.now() - since.getTime()) / 86400000));
  const dailyAvg = totalCo2 / days;

  const byCategory: Record<string, number> = {};
  for (const a of activities) {
    byCategory[a.category] = (byCategory[a.category] ?? 0) + a.co2Amount;
  }
  const sortedCategories = Object.entries(byCategory).sort((a, b) => b[1] - a[1]);
  const topCategory = sortedCategories[0];

  const completedIds = new Set(completions.map((c) => c.challengeId));
  const completedChallenges = challenges.filter((c) => completedIds.has(c.id));
  const pendingChallenges = challenges.filter((c) => !completedIds.has(c.id)).slice(0, 5);

  const systemPrompt = `You are an empathetic, expert carbon footprint coach embedded in the EcoTrace app.
Your role is to give personalized, actionable advice based on the user's actual activity data.
Be encouraging but honest. Keep each tip concrete and specific — not generic platitudes.
Respond ONLY with valid JSON matching this exact shape:
{
  "message": "string (2-3 warm, personal sentences based on their data)",
  "tips": [
    {
      "category": "transport|food|energy|shopping",
      "tip": "string (specific actionable tip, 1-2 sentences)",
      "impact": "string (e.g. 'Save ~12 kg CO₂/month')",
      "effort": "low|medium|high"
    }
  ],
  "focusArea": "string (the single biggest opportunity for them)",
  "weeklyGoal": "string (one concrete goal for the next 7 days)"
}
Return exactly 3 tips. Do not include any text outside the JSON.`;

  const userPrompt = `Here is my carbon footprint data for the last 30 days:

Total CO₂ logged: ${totalCo2.toFixed(1)} kg
Daily average: ${dailyAvg.toFixed(1)} kg/day (global average: ${GLOBAL_DAILY_AVERAGE_KG} kg/day)
I am ${dailyAvg < GLOBAL_DAILY_AVERAGE_KG ? `${((1 - dailyAvg / GLOBAL_DAILY_AVERAGE_KG) * 100).toFixed(0)}% below` : `${((dailyAvg / GLOBAL_DAILY_AVERAGE_KG - 1) * 100).toFixed(0)}% above`} the global average.

Breakdown by category:
${sortedCategories.map(([cat, kg]) => `- ${CATEGORY_LABELS[cat] ?? cat}: ${kg.toFixed(1)} kg (${((kg / totalCo2) * 100).toFixed(0)}%)`).join("\n") || "- No activities logged yet"}

Eco-challenges completed (${completedChallenges.length} total):
${completedChallenges.map((c) => `- ${c.title} (saves ${c.co2Reduction} kg CO₂)`).join("\n") || "- None yet"}

Available challenges not yet completed:
${pendingChallenges.map((c) => `- ${c.title} [${c.difficulty}] (saves ${c.co2Reduction} kg CO₂)`).join("\n")}

Please give me personalized coaching advice.`;

  try {
    const completion = await openai.chat.completions.create({
      model: process.env.OPENROUTER_API_KEY ? "mistralai/mistral-7b-instruct" : process.env.XAI_API_KEY ? "grok-3-mini" : "gpt-4o-mini",
      max_completion_tokens: 1024,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    let advice: unknown;
    try {
      advice = JSON.parse(raw);
    } catch {
      req.log.error({ raw }, "Failed to parse coach response as JSON");
      res.status(500).json({ error: "Invalid AI response format" });
      return;
    }

    res.json(advice);
  } catch (err: unknown) {
    req.log.error({ err }, "OpenAI coach request failed");
    const code = (err as { code?: string })?.code;
    const status = (err as { status?: number })?.status;
    if (code === "insufficient_quota" || status === 429) {
      res.status(402).json({ error: "OpenAI quota exceeded — please add billing credits at platform.openai.com to use the AI Coach." });
    } else {
      res.status(500).json({ error: "Coach unavailable, please try again" });
    }
  }
});

export default router;
