import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const automationRules = sqliteTable("automation_rules", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull(),
  name: text("name").notNull(),
  triggerType: text("trigger_type").notNull(),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").notNull()
});

export const automationActions = sqliteTable("automation_actions", {
  id: text("id").primaryKey(),
  ruleId: text("rule_id").notNull(),
  actionType: text("action_type").notNull(),
  configJson: text("config_json").notNull().default("{}"),
  sortOrder: integer("sort_order").notNull().default(0)
});

export const webhookEvents = sqliteTable("webhook_events", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id"),
  provider: text("provider").notNull(),
  eventType: text("event_type").notNull(),
  payloadJson: text("payload_json").notNull(),
  status: text("status").notNull().default("received"),
  createdAt: text("created_at").notNull()
});
