import { pgTable, text, serial, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const challengesTable = pgTable("challenges", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(),
  co2Reduction: real("co2_reduction").notNull(),
  icon: text("icon").notNull(),
  difficulty: text("difficulty").notNull(),
});

export const insertChallengeSchema = createInsertSchema(challengesTable).omit({ id: true });
export type InsertChallenge = z.infer<typeof insertChallengeSchema>;
export type Challenge = typeof challengesTable.$inferSelect;
