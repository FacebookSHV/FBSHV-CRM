import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

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

export const facebookAutomationActions = sqliteTable(
  "facebook_automation_actions",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id").notNull(),
    pageId: text("page_id"),
    eventId: text("event_id").notNull(),
    actionType: text("action_type").notNull(),
    targetId: text("target_id"),
    dedupeKey: text("dedupe_key").notNull(),
    status: text("status").notNull().default("started"),
    error: text("error"),
    metadataJson: text("metadata_json").notNull().default("{}"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull()
  },
  (table) => ({
    dedupeIdx: uniqueIndex("facebook_automation_actions_dedupe_unique").on(table.dedupeKey),
    eventIdx: index("facebook_automation_actions_event_idx").on(table.eventId)
  })
);
