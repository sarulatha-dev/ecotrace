import { pgTable, serial, text, real, timestamp } from "drizzle-orm/pg-core";

export const ecoSubscriptionsTable = pgTable("eco_subscriptions", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id").notNull(),
  bundleType: text("bundle_type").notNull(),
  monthlyCost: real("monthly_cost").notNull(),
  coinsUsed: real("coins_used").default(0),
  moneyPaid: real("money_paid").notNull(),
  status: text("status").default("active"),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
});
