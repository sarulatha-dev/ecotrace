import { pgTable, serial, text, integer, real, timestamp } from "drizzle-orm/pg-core";

export const neighborhoodStatsTable = pgTable("neighborhood_stats", {
  id: serial("id").primaryKey(),
  neighborhoodName: text("neighborhood_name").notNull(),
  totalHomes: integer("total_homes").default(0),
  totalCo2Saved: real("total_co2_saved").default(0),
  totalMoneySaved: real("total_money_saved").default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
