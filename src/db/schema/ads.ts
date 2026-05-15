import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const adAccounts = sqliteTable("ad_accounts", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull(),
  externalAccountId: text("external_account_id").notNull(),
  name: text("name").notNull(),
  status: text("status").notNull().default("mock")
});

export const campaigns = sqliteTable("campaigns", {
  id: text("id").primaryKey(),
  adAccountId: text("ad_account_id").notNull(),
  externalCampaignId: text("external_campaign_id").notNull(),
  name: text("name").notNull(),
  status: text("status").notNull()
});

export const adSets = sqliteTable("ad_sets", {
  id: text("id").primaryKey(),
  campaignId: text("campaign_id").notNull(),
  externalAdSetId: text("external_ad_set_id").notNull(),
  name: text("name").notNull(),
  budget: integer("budget").notNull().default(0),
  status: text("status").notNull()
});

export const ads = sqliteTable("ads", {
  id: text("id").primaryKey(),
  adSetId: text("ad_set_id").notNull(),
  externalAdId: text("external_ad_id").notNull(),
  name: text("name").notNull(),
  creativeJson: text("creative_json").notNull().default("{}"),
  status: text("status").notNull()
});

export const adMetricDaily = sqliteTable("ad_metric_daily", {
  id: text("id").primaryKey(),
  adId: text("ad_id").notNull(),
  date: text("date").notNull(),
  spend: integer("spend").notNull().default(0),
  impressions: integer("impressions").notNull().default(0),
  clicks: integer("clicks").notNull().default(0),
  conversions: integer("conversions").notNull().default(0),
  roas: real("roas").notNull().default(0)
});
