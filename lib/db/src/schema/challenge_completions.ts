import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const challengeCompletionsTable = pgTable("challenge_completions", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id").notNull(),
  challengeId: integer("challenge_id").notNull(),
  completedAt: timestamp("completed_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertChallengeCompletionSchema = createInsertSchema(challengeCompletionsTable).omit({
  id: true,
  completedAt: true,
});
export type InsertChallengeCompletion = z.infer<typeof insertChallengeCompletionSchema>;
export type ChallengeCompletion = typeof challengeCompletionsTable.$inferSelect;
