import { index, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const conversionEvents = sqliteTable(
  "conversion_events",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id").notNull(),
    eventId: text("event_id").notNull(),
    eventName: text("event_name").notNull(),
    eventSourceUrl: text("event_source_url"),
    status: text("status").notNull().default("received"),
    provider: text("provider").notNull().default("meta_capi"),
    responseJson: text("response_json").notNull().default("{}"),
    error: text("error"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull()
  },
  (table) => ({
    eventUnique: uniqueIndex("conversion_events_event_id_unique").on(table.eventId),
    statusIdx: index("conversion_events_status_idx").on(table.status, table.createdAt)
  })
);
