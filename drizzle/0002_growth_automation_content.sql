CREATE TABLE IF NOT EXISTS `facebook_automation_actions` (
  `id` text PRIMARY KEY NOT NULL,
  `workspace_id` text NOT NULL,
  `page_id` text,
  `event_id` text NOT NULL,
  `action_type` text NOT NULL,
  `target_id` text,
  `dedupe_key` text NOT NULL,
  `status` text DEFAULT 'started' NOT NULL,
  `error` text,
  `metadata_json` text DEFAULT '{}' NOT NULL,
  `created_at` text NOT NULL,
  `updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `facebook_automation_actions_dedupe_unique` ON `facebook_automation_actions` (`dedupe_key`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `facebook_automation_actions_event_idx` ON `facebook_automation_actions` (`event_id`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `page_audits` (
  `id` text PRIMARY KEY NOT NULL,
  `workspace_id` text NOT NULL,
  `page_id` text NOT NULL,
  `last_score` integer DEFAULT 0 NOT NULL,
  `status` text DEFAULT 'ready' NOT NULL,
  `summary` text DEFAULT '' NOT NULL,
  `updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `page_audits_page_idx` ON `page_audits` (`page_id`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `page_audit_runs` (
  `id` text PRIMARY KEY NOT NULL,
  `workspace_id` text NOT NULL,
  `page_id` text NOT NULL,
  `score` integer NOT NULL,
  `summary` text NOT NULL,
  `created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `page_audit_runs_page_created_idx` ON `page_audit_runs` (`page_id`,`created_at`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `page_audit_findings` (
  `id` text PRIMARY KEY NOT NULL,
  `run_id` text NOT NULL,
  `page_id` text NOT NULL,
  `category` text NOT NULL,
  `severity` text DEFAULT 'info' NOT NULL,
  `title` text NOT NULL,
  `recommendation` text NOT NULL,
  `created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `page_audit_findings_run_idx` ON `page_audit_findings` (`run_id`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `content_ideas` (
  `id` text PRIMARY KEY NOT NULL,
  `workspace_id` text NOT NULL,
  `page_id` text,
  `product_sku` text,
  `template` text NOT NULL,
  `title` text NOT NULL,
  `caption` text NOT NULL,
  `cta` text NOT NULL,
  `media_suggestion` text DEFAULT '' NOT NULL,
  `source_json` text DEFAULT '{}' NOT NULL,
  `created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `content_ideas_sku_idx` ON `content_ideas` (`product_sku`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `content_posts` (
  `id` text PRIMARY KEY NOT NULL,
  `workspace_id` text NOT NULL,
  `page_id` text NOT NULL,
  `product_sku` text,
  `template` text DEFAULT 'product_intro' NOT NULL,
  `title` text NOT NULL,
  `caption` text NOT NULL,
  `cta` text DEFAULT 'Nhắn tin cho shop' NOT NULL,
  `media_suggestion` text DEFAULT '' NOT NULL,
  `scheduled_at` text,
  `status` text DEFAULT 'draft' NOT NULL,
  `external_post_id` text,
  `error` text,
  `created_at` text NOT NULL,
  `updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `content_posts_status_idx` ON `content_posts` (`status`,`scheduled_at`);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `content_posts_page_sku_template_unique` ON `content_posts` (`page_id`,`product_sku`,`template`,`scheduled_at`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `content_calendar` (
  `id` text PRIMARY KEY NOT NULL,
  `workspace_id` text NOT NULL,
  `page_id` text,
  `date` text NOT NULL,
  `suggested_template` text NOT NULL,
  `theme` text NOT NULL,
  `created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `content_calendar_date_idx` ON `content_calendar` (`date`);
