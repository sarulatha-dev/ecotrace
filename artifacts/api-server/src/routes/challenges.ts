import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, challengesTable, challengeCompletionsTable } from "@workspace/db";
import {
  CompleteChallengeParams,
  CompleteChallengeBody,
  ListChallengeCompletionsQueryParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/challenges", async (_req, res): Promise<void> => {
  const challenges = await db.select().from(challengesTable);
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
