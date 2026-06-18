import { pgTable, text, serial, timestamp, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const activitiesTable = pgTable("activities", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id").notNull(),
  category: text("category").notNull(),
  activityType: text("activity_type").notNull(),
  activityLabel: text("activity_label").notNull(),
  value: real("value").notNull(),
  unit: text("unit").notNull(),
  co2Amount: real("co2_amount").notNull(),
  loggedAt: timestamp("logged_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertActivitySchema = createInsertSchema(activitiesTable).omit({
  id: true,
  loggedAt: true,
});
export type InsertActivity = z.infer<typeof insertActivitySchema>;
export type Activity = typeof activitiesTable.$inferSelect;
