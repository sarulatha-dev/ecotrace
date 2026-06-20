import { pgTable, text, serial, integer, real, boolean, date, timestamp } from "drizzle-orm/pg-core";

export const phoneUsageTable = pgTable("phone_usage", {
  id:               serial("id").primaryKey(),
  sessionId:        text("session_id").notNull(),
  usageDate:        date("usage_date").notNull(),
  screenTimeHours:  real("screen_time_hours").default(0).notNull(),
  appUsageHours:    real("app_usage_hours").default(0).notNull(),
  batteryDrainMah:  real("battery_drain_mah").default(0).notNull(),
  co2Kg:            real("co2_kg").default(0).notNull(),
  createdAt:        timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const treePlantsTable = pgTable("tree_plants", {
  id:           serial("id").primaryKey(),
  sessionId:    text("session_id").notNull(),
  plantDate:    date("plant_date").notNull(),
  treesPlanted: integer("trees_planted").default(0).notNull(),
  co2OffsetKg:  real("co2_offset_kg").default(0).notNull(),
  location:     text("location").notNull(),
  projectName:  text("project_name").notNull(),
  isVerified:   boolean("is_verified").default(false).notNull(),
  createdAt:    timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const treePlantDonationsTable = pgTable("tree_plant_donations", {
  id:               serial("id").primaryKey(),
  sessionId:        text("session_id").notNull(),
  treePlantId:      integer("tree_plant_id").notNull(),
  screenTimeHours:  real("screen_time_hours").default(0),
  treesEarned:      real("trees_earned").default(0),
  createdAt:        timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const passiveRewardsTable = pgTable("passive_rewards", {
  id:          serial("id").primaryKey(),
  sessionId:   text("session_id").notNull(),
  rewardType:  text("reward_type").notNull(),
  rewardValue: real("reward_value").notNull(),
  rewardDate:  date("reward_date").notNull(),
  isClaimed:   boolean("is_claimed").default(false).notNull(),
  createdAt:   timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
