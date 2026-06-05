CREATE TABLE `imageflow_jobs` (
  `id` text PRIMARY KEY NOT NULL,
  `workspace_id` text NOT NULL,
  `post_id` text,
  `product_sku` text NOT NULL,
  `title` text NOT NULL,
  `status` text DEFAULT 'queued' NOT NULL,
  `target_format` text DEFAULT 'facebook_album' NOT NULL,
  `target_aspect_ratio` text DEFAULT '4:5' NOT NULL,
  `output_width` integer DEFAULT 1080 NOT NULL,
  `output_height` integer DEFAULT 1350 NOT NULL,
  `requested_count` integer DEFAULT 5 NOT NULL,
  `prompt_json` text DEFAULT '{}' NOT NULL,
  `product_context_json` text DEFAULT '{}' NOT NULL,
  `result_manifest_json` text DEFAULT '{}' NOT NULL,
  `error` text,
  `locked_by` text,
  `locked_until` text,
  `created_at` text NOT NULL,
  `updated_at` text NOT NULL,
  `started_at` text,
  `finished_at` text
);
CREATE INDEX `imageflow_jobs_status_idx` ON `imageflow_jobs` (`workspace_id`, `status`, `updated_at`);
CREATE INDEX `imageflow_jobs_post_idx` ON `imageflow_jobs` (`post_id`);

CREATE TABLE `imageflow_assets` (
  `id` text PRIMARY KEY NOT NULL,
  `workspace_id` text NOT NULL,
  `job_id` text NOT NULL,
  `post_id` text,
  `media_id` text,
  `asset_index` integer DEFAULT 0 NOT NULL,
  `role` text DEFAULT 'album_image' NOT NULL,
  `status` text DEFAULT 'uploaded' NOT NULL,
  `file_name` text NOT NULL,
  `mime_type` text NOT NULL,
  `file_size` integer DEFAULT 0 NOT NULL,
  `r2_key` text,
  `public_url` text,
  `prompt_json` text DEFAULT '{}' NOT NULL,
  `created_at` text NOT NULL
);
CREATE INDEX `imageflow_assets_job_idx` ON `imageflow_assets` (`job_id`, `asset_index`);
CREATE INDEX `imageflow_assets_post_idx` ON `imageflow_assets` (`post_id`);
