CREATE TABLE IF NOT EXISTS `content_media` (
  `id` text PRIMARY KEY NOT NULL,
  `workspace_id` text NOT NULL,
  `post_id` text NOT NULL,
  `media_type` text NOT NULL,
  `mime_type` text NOT NULL,
  `file_name` text NOT NULL,
  `file_size` integer DEFAULT 0 NOT NULL,
  `r2_key` text,
  `public_url` text,
  `status` text DEFAULT 'uploaded' NOT NULL,
  `error` text,
  `created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `content_media_post_idx` ON `content_media` (`post_id`);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `content_post_targets` (
  `id` text PRIMARY KEY NOT NULL,
  `post_id` text NOT NULL,
  `page_id` text NOT NULL,
  `status` text DEFAULT 'pending' NOT NULL,
  `created_at` text NOT NULL,
  `updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `content_post_targets_post_page_unique` ON `content_post_targets` (`post_id`,`page_id`);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `content_publish_jobs` (
  `id` text PRIMARY KEY NOT NULL,
  `post_id` text NOT NULL,
  `page_id` text NOT NULL,
  `idempotency_key` text NOT NULL,
  `status` text DEFAULT 'pending' NOT NULL,
  `dry_run` integer DEFAULT true NOT NULL,
  `scheduled_at` text,
  `external_post_id` text,
  `error` text,
  `created_at` text NOT NULL,
  `updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `content_publish_jobs_idempotency_unique` ON `content_publish_jobs` (`idempotency_key`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `content_publish_jobs_post_idx` ON `content_publish_jobs` (`post_id`);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `content_publish_logs` (
  `id` text PRIMARY KEY NOT NULL,
  `job_id` text NOT NULL,
  `post_id` text NOT NULL,
  `page_id` text NOT NULL,
  `action` text NOT NULL,
  `status` text NOT NULL,
  `message` text DEFAULT '' NOT NULL,
  `metadata_json` text DEFAULT '{}' NOT NULL,
  `created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `ad_actions_log` (
  `id` text PRIMARY KEY NOT NULL,
  `workspace_id` text NOT NULL,
  `action_type` text NOT NULL,
  `target_id` text,
  `dry_run` integer DEFAULT true NOT NULL,
  `status` text DEFAULT 'blocked' NOT NULL,
  `error` text,
  `metadata_json` text DEFAULT '{}' NOT NULL,
  `created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `ad_drafts` (
  `id` text PRIMARY KEY NOT NULL,
  `workspace_id` text NOT NULL,
  `source_post_id` text,
  `ad_account_id` text,
  `name` text NOT NULL,
  `budget_daily` integer DEFAULT 0 NOT NULL,
  `status` text DEFAULT 'draft' NOT NULL,
  `config_json` text DEFAULT '{}' NOT NULL,
  `created_at` text NOT NULL,
  `updated_at` text NOT NULL
);
--> statement-breakpoint
INSERT OR IGNORE INTO `automation_rules` (`id`, `workspace_id`, `name`, `trigger_type`, `active`, `created_at`)
VALUES
  ('rule_auto_reply_message', 'workspace-demo', 'Auto reply message', 'facebook_message', true, '2026-05-16T00:00:00.000Z'),
  ('rule_auto_reply_comment', 'workspace-demo', 'Auto reply comment', 'facebook_comment', true, '2026-05-16T00:00:00.000Z'),
  ('rule_hide_phone_comment', 'workspace-demo', 'Hide comment chứa số điện thoại', 'facebook_comment', true, '2026-05-16T00:00:00.000Z');
--> statement-breakpoint
INSERT OR IGNORE INTO `automation_actions` (`id`, `rule_id`, `action_type`, `config_json`, `sort_order`)
VALUES
  ('action_auto_reply_message', 'rule_auto_reply_message', 'auto_reply_message', '{"permission":"pages_messaging"}', 10),
  ('action_auto_reply_comment', 'rule_auto_reply_comment', 'auto_reply_comment', '{"permission":"pages_manage_engagement"}', 10),
  ('action_hide_phone_comment', 'rule_hide_phone_comment', 'auto_hide_phone_comment', '{"permission":"pages_manage_engagement"}', 20);
