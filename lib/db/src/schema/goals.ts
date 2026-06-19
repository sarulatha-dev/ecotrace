import { pgTable, text, real, timestamp } from "drizzle-orm/pg-core";

export const goalsTable = pgTable("goals", {
  sessionId: text("session_id").primaryKey(),
  dailyCo2Goal: real("daily_co2_goal").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Goal = typeof goalsTable.$inferSelect;
