CREATE TABLE IF NOT EXISTS `ai_provider_keys` (
  `id` text PRIMARY KEY NOT NULL,
  `workspace_id` text NOT NULL,
  `provider` text NOT NULL,
  `key_name` text NOT NULL,
  `encrypted_value` text NOT NULL,
  `masked_value` text NOT NULL,
  `active` integer DEFAULT true NOT NULL,
  `status` text DEFAULT 'saved' NOT NULL,
  `last_tested_at` text,
  `last_error` text,
  `created_at` text NOT NULL,
  `updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `ai_provider_keys_workspace_key_unique` ON `ai_provider_keys` (`workspace_id`,`key_name`);
