import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const imageflowJobs = sqliteTable(
  "imageflow_jobs",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id").notNull(),
    postId: text("post_id"),
    productSku: text("product_sku").notNull(),
    title: text("title").notNull(),
    status: text("status").notNull().default("queued"),
    targetFormat: text("target_format").notNull().default("facebook_album"),
    targetAspectRatio: text("target_aspect_ratio").notNull().default("4:5"),
    outputWidth: integer("output_width").notNull().default(1080),
    outputHeight: integer("output_height").notNull().default(1350),
    requestedCount: integer("requested_count").notNull().default(5),
    promptJson: text("prompt_json").notNull().default("{}"),
    productContextJson: text("product_context_json").notNull().default("{}"),
    resultManifestJson: text("result_manifest_json").notNull().default("{}"),
    error: text("error"),
    lockedBy: text("locked_by"),
    lockedUntil: text("locked_until"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
    startedAt: text("started_at"),
    finishedAt: text("finished_at")
  },
  (table) => ({
    statusIdx: index("imageflow_jobs_status_idx").on(table.workspaceId, table.status, table.updatedAt),
    postIdx: index("imageflow_jobs_post_idx").on(table.postId)
  })
);

export const imageflowAssets = sqliteTable(
  "imageflow_assets",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id").notNull(),
    jobId: text("job_id").notNull(),
    postId: text("post_id"),
    mediaId: text("media_id"),
    assetIndex: integer("asset_index").notNull().default(0),
    role: text("role").notNull().default("album_image"),
    status: text("status").notNull().default("uploaded"),
    fileName: text("file_name").notNull(),
    mimeType: text("mime_type").notNull(),
    fileSize: integer("file_size").notNull().default(0),
    r2Key: text("r2_key"),
    publicUrl: text("public_url"),
    promptJson: text("prompt_json").notNull().default("{}"),
    createdAt: text("created_at").notNull()
  },
  (table) => ({
    jobIdx: index("imageflow_assets_job_idx").on(table.jobId, table.assetIndex),
    postIdx: index("imageflow_assets_post_idx").on(table.postId)
  })
);
