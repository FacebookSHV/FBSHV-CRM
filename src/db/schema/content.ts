import { index, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const contentIdeas = sqliteTable(
  "content_ideas",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id").notNull(),
    pageId: text("page_id"),
    productSku: text("product_sku"),
    template: text("template").notNull(),
    title: text("title").notNull(),
    caption: text("caption").notNull(),
    cta: text("cta").notNull(),
    mediaSuggestion: text("media_suggestion").notNull().default(""),
    sourceJson: text("source_json").notNull().default("{}"),
    createdAt: text("created_at").notNull()
  },
  (table) => ({
    skuIdx: index("content_ideas_sku_idx").on(table.productSku)
  })
);

export const contentPosts = sqliteTable(
  "content_posts",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id").notNull(),
    pageId: text("page_id").notNull(),
    productSku: text("product_sku"),
    template: text("template").notNull().default("product_intro"),
    title: text("title").notNull(),
    caption: text("caption").notNull(),
    cta: text("cta").notNull().default("Nhắn tin cho shop"),
    mediaSuggestion: text("media_suggestion").notNull().default(""),
    scheduledAt: text("scheduled_at"),
    status: text("status").notNull().default("draft"),
    externalPostId: text("external_post_id"),
    error: text("error"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull()
  },
  (table) => ({
    statusIdx: index("content_posts_status_idx").on(table.status, table.scheduledAt),
    pageSkuUnique: uniqueIndex("content_posts_page_sku_template_unique").on(
      table.pageId,
      table.productSku,
      table.template,
      table.scheduledAt
    )
  })
);

export const contentCalendar = sqliteTable(
  "content_calendar",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id").notNull(),
    pageId: text("page_id"),
    date: text("date").notNull(),
    suggestedTemplate: text("suggested_template").notNull(),
    theme: text("theme").notNull(),
    createdAt: text("created_at").notNull()
  },
  (table) => ({
    dateIdx: index("content_calendar_date_idx").on(table.date)
  })
);
