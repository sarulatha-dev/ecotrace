import { Router, type IRouter } from "express";
import { eq, and, gte, desc } from "drizzle-orm";
import { db, activitiesTable, challengeCompletionsTable, challengesTable } from "@workspace/db";
import { GetCoachAdviceBody } from "@workspace/api-zod";
import { openai } from "@workspace/integrations-openai-ai-server";
import { GLOBAL_DAILY_AVERAGE_KG } from "../lib/carbon-factors.js";

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

function getFallbackAdvice(totalCo2: number, dailyAvg: number, activities: any[]) {
  // Find highest category
  const byCategory: Record<string, number> = {};
  for (const a of activities) {
    byCategory[a.category] = (byCategory[a.category] ?? 0) + a.co2Amount;
  }
  const sortedCategories = Object.entries(byCategory).sort((a, b) => b[1] - a[1]);
  const topCategory = sortedCategories[0]?.[0];

  if (activities.length === 0) {
    return {
      message: "Welcome to EcoTrace! I am your AI Eco-Coach. It looks like you haven't logged any activities yet. Log your first travel, meal, or energy activity, and I will analyze it to provide personalized tips to reduce your carbon footprint!",
      focusArea: "Logging your first carbon-emitting activity",
      weeklyGoal: "Log at least 3 daily activities this week to establish your carbon baseline.",
      tips: [
        {
          category: "transport",
          tip: "Consider walking or cycling for short trips under 2 km instead of driving.",
          impact: "Save ~15 kg CO₂/month",
          effort: "low"
        },
        {
          category: "food",
          tip: "Try incorporating one plant-based or vegetarian day into your week.",
          impact: "Save ~20 kg CO₂/month",
          effort: "medium"
        },
        {
          category: "energy",
          tip: "Unplug chargers and electronics when not in use to reduce standby power consumption.",
          impact: "Save ~8 kg CO₂/month",
          effort: "low"
        }
      ]
    };
  }

  if (topCategory === "transport") {
    return {
      message: `I've analyzed your carbon footprint, and transport is currently your largest emission source (${byCategory.transport?.toFixed(1)} kg CO₂). By making minor changes in how you commute, you can make a huge impact on your total footprint!`,
      focusArea: "Optimizing your daily commute and travel habits",
      weeklyGoal: "Try to replace at least one car trip with public transit or walking this week.",
      tips: [
        {
          category: "transport",
          tip: "Combine multiple short car trips into one efficient route to reduce driving distance.",
          impact: "Save ~18 kg CO₂/month",
          effort: "low"
        },
        {
          category: "transport",
          tip: "Use public transport like buses or trains for your long-distance commute twice a week.",
          impact: "Save ~45 kg CO₂/month",
          effort: "medium"
        },
        {
          category: "energy",
          tip: "Adjust your home thermostat by 1-2 degrees to save energy while you are away.",
          impact: "Save ~12 kg CO₂/month",
          effort: "low"
        }
      ]
    };
  }

  if (topCategory === "food") {
    return {
      message: `Based on your recent logging, food choices represent your largest source of emissions (${byCategory.food?.toFixed(1)} kg CO₂). Adjusting your diet slightly is one of the fastest ways to lower your footprint.`,
      focusArea: "Shifting towards plant-based meals",
      weeklyGoal: "Cook three completely vegetarian or vegan meals this week.",
      tips: [
        {
          category: "food",
          tip: "Replace one beef meal with chicken or turkey, which have a significantly lower carbon footprint.",
          impact: "Save ~25 kg CO₂/month",
          effort: "low"
        },
        {
          category: "food",
          tip: "Opt for locally-sourced, seasonal produce to reduce emissions from long-distance food transport.",
          impact: "Save ~10 kg CO₂/month",
          effort: "medium"
        },
        {
          category: "shopping",
          tip: "Bring reusable bags to the grocery store to eliminate plastic waste.",
          impact: "Save ~2.0 kg CO₂/month",
          effort: "low"
        }
      ]
    };
  }

  if (topCategory === "energy") {
    return {
      message: `Your home energy usage seems to be the primary driver of your carbon emissions (${byCategory.energy?.toFixed(1)} kg CO₂). Simple home efficiency improvements can lead to major carbon and financial savings.`,
      focusArea: "Improving household energy efficiency",
      weeklyGoal: "Audit your home electronics and switch off power strips at night.",
      tips: [
        {
          category: "energy",
          tip: "Switch out traditional incandescent light bulbs for energy-efficient LEDs.",
          impact: "Save ~15 kg CO₂/month",
          effort: "low"
        },
        {
          category: "energy",
          tip: "Lower your water heater temperature to 120°F (49°C) to reduce continuous heating energy.",
          impact: "Save ~18 kg CO₂/month",
          effort: "low"
        },
        {
          category: "transport",
          tip: "Walk or ride a bike for quick errands nearby instead of using your car.",
          impact: "Save ~10 kg CO₂/month",
          effort: "low"
        }
      ]
    };
  }

  if (topCategory === "shopping") {
    return {
      message: `Your shopping and goods consumption is currently contributing most to your carbon output (${byCategory.shopping?.toFixed(1)} kg CO₂). Practicing conscious purchasing is key to reducing this footprint.`,
      focusArea: "Embracing a minimalist and circular consumption habit",
      weeklyGoal: "Commit to a 'no-buy' week for non-essential items.",
      tips: [
        {
          category: "shopping",
          tip: "Consider buying high-quality secondhand clothes or electronics instead of brand new ones.",
          impact: "Save ~30 kg CO₂/month",
          effort: "medium"
        },
        {
          category: "shopping",
          tip: "Repair broken or damaged household items instead of immediately replacing them.",
          impact: "Save ~15 kg CO₂/month",
          effort: "medium"
        },
        {
          category: "food",
          tip: "Reduce food waste by planning your weekly meals and buying only necessary ingredients.",
          impact: "Save ~12 kg CO₂/month",
          effort: "low"
        }
      ]
    };
  }

  return {
    message: "Great job tracking your eco-activities! Your daily average looks promising. Let's work together on targeted improvements to shrink your carbon footprint even further.",
    focusArea: "Diversifying your daily eco-friendly activities",
    weeklyGoal: "Establish a habit of logging at least one positive eco-action every single day.",
    tips: [
      {
        category: "transport",
        tip: "Ensure your car tires are properly inflated to optimize fuel efficiency.",
        impact: "Save ~8 kg CO₂/month",
        effort: "low"
      },
      {
        category: "food",
        tip: "Incorporate more plant-based snacks and meals into your weekly diet.",
        impact: "Save ~15 kg CO₂/month",
        effort: "low"
      },
      {
        category: "energy",
        tip: "Wash your laundry in cold water instead of hot to save heating energy.",
        impact: "Save ~10 kg CO₂/month",
        effort: "low"
      }
    ]
  };
}

  const openrouterKey = process.env.OPENROUTER_API_KEY;
  const xaiKey = process.env.XAI_API_KEY;
  const openaiKey =
    process.env.AI_INTEGRATIONS_OPENAI_API_KEY ??
    process.env.OPENAI_API_KEY;
  const hasApiKey = !!(openrouterKey || xaiKey || openaiKey);

  if (!hasApiKey) {
    const fallback = getFallbackAdvice(totalCo2, dailyAvg, activities);
    res.json(fallback);
    return;
  }

  try {
    const completion = await openai.chat.completions.create({
      model: process.env.OPENROUTER_API_KEY ? "meta-llama/llama-3.1-8b-instruct" : process.env.XAI_API_KEY ? "grok-3-mini" : "gpt-4o-mini",
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
      const fallback = getFallbackAdvice(totalCo2, dailyAvg, activities);
      res.json(fallback);
      return;
    }

    res.json(advice);
  } catch (err: unknown) {
    req.log.error({ err }, "OpenAI coach request failed, using local fallback");
    const fallback = getFallbackAdvice(totalCo2, dailyAvg, activities);
    res.json(fallback);
  }
});

export default router;
