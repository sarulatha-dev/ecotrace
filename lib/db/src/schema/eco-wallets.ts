import { pgTable, text, real, timestamp } from "drizzle-orm/pg-core";

export const ecoWalletsTable = pgTable("eco_wallets", {
  sessionId: text("session_id").primaryKey(),
  coinBalance: real("coin_balance").default(0).notNull(),
  moneyBalance: real("money_balance").default(0).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
