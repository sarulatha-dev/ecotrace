import { pgTable, serial, text, real, timestamp } from "drizzle-orm/pg-core";

export const ecoTransactionsTable = pgTable("eco_transactions", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id").notNull(),
  transactionType: text("transaction_type").notNull(),
  coins: real("coins").notNull(),
  money: real("money").default(0),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
