import { pgTable, serial, integer, text, timestamp, real } from "drizzle-orm/pg-core";
import { smartDevicesTable } from "./smart-devices";

export const autoOptimizationsTable = pgTable("auto_optimizations", {
  id: serial("id").primaryKey(),
  deviceId: integer("device_id").notNull().references(() => smartDevicesTable.id, { onDelete: "cascade" }),
  optimizationType: text("optimization_type").notNull(),
  scheduledTime: timestamp("scheduled_time", { withTimezone: true }),
  actualTime: timestamp("actual_time", { withTimezone: true }),
  energySavedKwh: real("energy_saved_kwh").default(0),
  co2SavedKg: real("co2_saved_kg").default(0),
  moneySaved: real("money_saved").default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
