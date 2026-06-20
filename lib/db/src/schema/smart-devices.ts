import { pgTable, serial, text, boolean, timestamp } from "drizzle-orm/pg-core";

export const smartDevicesTable = pgTable("smart_devices", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id").notNull(),
  deviceType: text("device_type").notNull(),
  deviceBrand: text("device_brand"),
  deviceId: text("device_id").notNull(),
  deviceName: text("device_name"),
  isConnected: boolean("is_connected").default(false),
  optimizationEnabled: boolean("optimization_enabled").default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
