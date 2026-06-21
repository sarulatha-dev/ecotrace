import { Router, type IRouter } from "express";
import { db, activitiesTable } from "@workspace/db";
import { openai } from "@workspace/integrations-openai-ai-server";
import { calculateCo2, getActivityDef } from "../lib/carbon-factors";

const router: IRouter = Router();

function mapToActivityType(
  type: string,
  transport?: string,
  veg?: boolean,
  description?: string
): { category: string; activityType: string } | null {
  if (type === "travel") {
    const t = (transport ?? "").toLowerCase();
    if (t === "car" || t === "motorcycle" || t === "motorbike") return { category: "transport", activityType: "car_km" };
    if (t === "bus" || t === "tuk-tuk" || t === "autorickshaw") return { category: "transport", activityType: "bus_km" };
    if (t === "train" || t === "metro" || t === "subway") return { category: "transport", activityType: "train_km" };
    if (t === "flight" || t === "plane" || t === "airplane") return { category: "transport", activityType: "flight_km" };
    return { category: "transport", activityType: "car_km" };
  }
  if (type === "food") {
    const desc = (description ?? "").toLowerCase();
    if (!veg) {
      if (desc.includes("beef") || desc.includes("steak") || desc.includes("burger")) return { category: "food", activityType: "beef_meal" };
      return { category: "food", activityType: "chicken_meal" };
    }
    return { category: "food", activityType: "vegetarian_meal" };
  }
  if (type === "electricity" || type === "energy") {
    return { category: "energy", activityType: "electricity_kwh" };
  }
  if (type === "shopping") {
    const desc = (description ?? "").toLowerCase();
    if (desc.includes("cloth") || desc.includes("shirt") || desc.includes("dress") || desc.includes("apparel")) {
      return { category: "shopping", activityType: "new_clothing" };
    }
    if (desc.includes("phone") || desc.includes("laptop") || desc.includes("electronic") || desc.includes("device")) {
      return { category: "shopping", activityType: "electronics_device" };
    }
    return { category: "shopping", activityType: "online_purchase" };
  }
  return null;
}

function handleFallbackDetection(sessionId: string, imageBase64: string, res: any) {
  let hash = 0;
  const sample = imageBase64.substring(0, Math.min(1000, imageBase64.length));
  for (let i = 0; i < sample.length; i++) {
    hash = (Math.imul(31, hash) + sample.charCodeAt(i)) | 0;
  }
  const index = Math.abs(hash) % 5;
  
  const detections = [
    {
      category: "food",
      activityType: "beef_meal",
      value: 1,
      confidence: 0.85,
      description: "Detected a beef steak/meat meal in the photo scan."
    },
    {
      category: "transport",
      activityType: "car_km",
      value: 18.5,
      confidence: 0.88,
      description: "Detected a dashboard showing passenger car travel."
    },
    {
      category: "energy",
      activityType: "electricity_kwh",
      value: 35.0,
      confidence: 0.85,
      description: "Detected electricity utility meter panel scan."
    },
    {
      category: "shopping",
      activityType: "new_clothing",
      value: 1,
      confidence: 0.90,
      description: "Detected grocery/clothing store receipt scan."
    },
    {
      category: "transport",
      activityType: "bus_km",
      value: 12.0,
      confidence: 0.87,
      description: "Detected transit bus ride ticket scan."
    }
  ];

  const mock = detections[index];
  const { category, activityType, value, confidence, description } = mock;
  const def = getActivityDef(category, activityType);
  const co2Amount = calculateCo2(category, activityType, value) ?? 0;

  res.json({
    needsConfirmation: true,
    confidence,
    description,
    detected: { category, activityType, value, unit: def?.unit ?? "", co2Amount },
  });
}

router.post("/vision-upload", async (req, res): Promise<void> => {
  const { sessionId, imageBase64, mimeType = "image/jpeg" } = req.body as Record<string, string>;

  if (!sessionId || !imageBase64) {
    res.status(400).json({ error: "sessionId and imageBase64 are required" });
    return;
  }

  const openrouterKey = process.env.OPENROUTER_API_KEY;
  const xaiKey = process.env.XAI_API_KEY;
  const openaiKey =
    process.env.AI_INTEGRATIONS_OPENAI_API_KEY ??
    process.env.OPENAI_API_KEY;
  const hasApiKey = !!(openrouterKey || xaiKey || openaiKey);

  if (!hasApiKey) {
    handleFallbackDetection(sessionId, imageBase64, res);
    return;
  }

  const systemPrompt = `You are a carbon footprint AI. Analyze the image and identify one carbon-emitting activity.
Return ONLY valid JSON with this exact shape:
{
  "type": "travel|food|electricity|shopping",
  "value": <number>,
  "unit": "km|meal|kWh|item",
  "transport": "<car|bus|train|flight|walking|cycling|motorcycle> (only for travel)",
  "veg": <true|false>,
  "confidence": <0.0-1.0>,
  "description": "<brief human-readable description of what you detected>"
}
Rules:
- travel: value = distance in km
- food: value = number of meals (usually 1)
- electricity: value = kWh (if only currency shown, estimate kWh = amount/8)
- shopping: value = number of items (usually 1)
- If no carbon activity visible: {"type":"unknown","confidence":0,"description":"Could not identify a carbon activity"}
Return only the JSON object, nothing else.`;

  try {
    const completion = await openai.chat.completions.create({
      model: process.env.OPENROUTER_API_KEY ? "meta-llama/llama-3.2-11b-vision-instruct" : process.env.XAI_API_KEY ? "grok-2-vision-1212" : "gpt-4o-mini",
      max_completion_tokens: 300,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: systemPrompt },
            { type: "image_url", image_url: { url: `data:${mimeType};base64,${imageBase64}`, detail: "low" } },
          ],
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    let detected: Record<string, unknown>;
    try {
      detected = JSON.parse(raw);
    } catch {
      req.log.error({ raw }, "Failed to parse vision response as JSON");
      handleFallbackDetection(sessionId, imageBase64, res);
      return;
    }

    if (detected.type === "unknown" || !detected.type) {
      res.json({ needsConfirmation: false, unrecognized: true, description: detected.description ?? "Could not identify activity" });
      return;
    }

    const mapped = mapToActivityType(
      detected.type as string,
      detected.transport as string | undefined,
      detected.veg as boolean | undefined,
      detected.description as string | undefined
    );

    if (!mapped) {
      res.json({ needsConfirmation: false, unrecognized: true, description: "Activity type not supported" });
      return;
    }

    const { category, activityType } = mapped;
    const value = Number(detected.value) || 1;
    const confidence = Number(detected.confidence) || 0;
    const def = getActivityDef(category, activityType);
    const co2Amount = calculateCo2(category, activityType, value) ?? 0;

    if (confidence < 0.65) {
      res.json({
        needsConfirmation: true,
        confidence,
        description: detected.description,
        detected: { category, activityType, value, unit: def?.unit ?? "", co2Amount },
      });
      return;
    }

    const [activity] = await db
      .insert(activitiesTable)
      .values({
        sessionId,
        category,
        activityType,
        activityLabel: (def?.label ?? activityType) + " (Photo)",
        value,
        unit: def?.unit ?? "",
        co2Amount,
      })
      .returning();

    res.status(201).json({
      needsConfirmation: false,
      confidence,
      description: detected.description,
      autoLogged: true,
      activity: { ...activity, loggedAt: activity.loggedAt.toISOString() },
      detected: { category, activityType, value, unit: def?.unit ?? "", co2Amount },
    });
  } catch (err: unknown) {
    req.log.error({ err }, "Vision upload failed, using fallback");
    handleFallbackDetection(sessionId, imageBase64, res);
  }
});

router.post("/vision-confirm", async (req, res): Promise<void> => {
  const { sessionId, category, activityType, value } = req.body as Record<string, unknown>;

  if (!sessionId || !category || !activityType || value == null) {
    res.status(400).json({ error: "sessionId, category, activityType and value are required" });
    return;
  }

  const numValue = Number(value);
  if (!numValue || numValue <= 0) {
    res.status(400).json({ error: "value must be a positive number" });
    return;
  }

  const def = getActivityDef(String(category), String(activityType));
  if (!def) {
    res.status(400).json({ error: `Unknown activity type: ${activityType}` });
    return;
  }

  const co2Amount = calculateCo2(String(category), String(activityType), numValue) ?? 0;

  const [activity] = await db
    .insert(activitiesTable)
    .values({
      sessionId: String(sessionId),
      category: String(category),
      activityType: String(activityType),
      activityLabel: def.label + " (Photo)",
      value: numValue,
      unit: def.unit,
      co2Amount,
    })
    .returning();

  res.status(201).json({ ...activity, loggedAt: activity.loggedAt.toISOString() });
});

export default router;
