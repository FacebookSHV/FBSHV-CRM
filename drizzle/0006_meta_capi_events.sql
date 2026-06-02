CREATE TABLE IF NOT EXISTS `conversion_events` (
  `id` text PRIMARY KEY NOT NULL,
  `workspace_id` text NOT NULL,
  `event_id` text NOT NULL,
  `event_name` text NOT NULL,
  `event_source_url` text,
  `status` text DEFAULT 'received' NOT NULL,
  `provider` text DEFAULT 'meta_capi' NOT NULL,
  `response_json` text DEFAULT '{}' NOT NULL,
  `error` text,
  `created_at` text NOT NULL,
  `updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `conversion_events_event_id_unique` ON `conversion_events` (`event_id`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `conversion_events_status_idx` ON `conversion_events` (`status`,`created_at`);
