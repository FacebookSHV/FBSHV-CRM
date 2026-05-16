import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

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

export const contentMedia = sqliteTable(
  "content_media",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id").notNull(),
    postId: text("post_id").notNull(),
    mediaType: text("media_type").notNull(),
    mimeType: text("mime_type").notNull(),
    fileName: text("file_name").notNull(),
    fileSize: integer("file_size").notNull().default(0),
    r2Key: text("r2_key"),
    publicUrl: text("public_url"),
    status: text("status").notNull().default("uploaded"),
    error: text("error"),
    createdAt: text("created_at").notNull()
  },
  (table) => ({
    postIdx: index("content_media_post_idx").on(table.postId)
  })
);

export const contentPostTargets = sqliteTable(
  "content_post_targets",
  {
    id: text("id").primaryKey(),
    postId: text("post_id").notNull(),
    pageId: text("page_id").notNull(),
    status: text("status").notNull().default("pending"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull()
  },
  (table) => ({
    targetUnique: uniqueIndex("content_post_targets_post_page_unique").on(table.postId, table.pageId)
  })
);

export const contentPublishJobs = sqliteTable(
  "content_publish_jobs",
  {
    id: text("id").primaryKey(),
    postId: text("post_id").notNull(),
    pageId: text("page_id").notNull(),
    idempotencyKey: text("idempotency_key").notNull(),
    status: text("status").notNull().default("pending"),
    dryRun: integer("dry_run", { mode: "boolean" }).notNull().default(true),
    scheduledAt: text("scheduled_at"),
    externalPostId: text("external_post_id"),
    error: text("error"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull()
  },
  (table) => ({
    idempotencyUnique: uniqueIndex("content_publish_jobs_idempotency_unique").on(table.idempotencyKey),
    postIdx: index("content_publish_jobs_post_idx").on(table.postId)
  })
);

export const contentPublishLogs = sqliteTable("content_publish_logs", {
  id: text("id").primaryKey(),
  jobId: text("job_id").notNull(),
  postId: text("post_id").notNull(),
  pageId: text("page_id").notNull(),
  action: text("action").notNull(),
  status: text("status").notNull(),
  message: text("message").notNull().default(""),
  metadataJson: text("metadata_json").notNull().default("{}"),
  createdAt: text("created_at").notNull()
});
