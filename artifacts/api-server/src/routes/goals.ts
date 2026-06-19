import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, goalsTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/goals", async (req, res): Promise<void> => {
  const sessionId = req.query.sessionId as string | undefined;
  if (!sessionId) {
    res.status(400).json({ error: "sessionId is required" });
    return;
  }

  const [goal] = await db
    .select()
    .from(goalsTable)
    .where(eq(goalsTable.sessionId, sessionId));

  if (!goal) {
    res.json({ sessionId, dailyCo2Goal: null });
    return;
  }

  res.json({ sessionId: goal.sessionId, dailyCo2Goal: goal.dailyCo2Goal });
});

router.put("/goals", async (req, res): Promise<void> => {
  const { sessionId, dailyCo2Goal } = req.body;

  if (!sessionId || typeof dailyCo2Goal !== "number" || dailyCo2Goal <= 0) {
    res.status(400).json({ error: "sessionId and a positive dailyCo2Goal are required" });
    return;
  }

  const [goal] = await db
    .insert(goalsTable)
    .values({ sessionId, dailyCo2Goal })
    .onConflictDoUpdate({
      target: goalsTable.sessionId,
      set: { dailyCo2Goal, updatedAt: new Date() },
    })
    .returning();

  res.json({ sessionId: goal.sessionId, dailyCo2Goal: goal.dailyCo2Goal });
});

export default router;
