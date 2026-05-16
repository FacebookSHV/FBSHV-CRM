CREATE TABLE `facebook_connections` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`connected_by_user_id` text,
	`facebook_user_id` text NOT NULL,
	`access_token_encrypted` text NOT NULL,
	`token_expires_at` text,
	`scopes` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `facebook_connections_workspace_user_unique` ON `facebook_connections` (`workspace_id`,`facebook_user_id`);--> statement-breakpoint
ALTER TABLE `pages` ADD `connection_id` text;--> statement-breakpoint
ALTER TABLE `pages` ADD `page_access_token_encrypted` text;--> statement-breakpoint
ALTER TABLE `pages` ADD `subscribed_webhook` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `pages` ADD `picture_url` text;--> statement-breakpoint
ALTER TABLE `pages` ADD `created_at` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `pages` ADD `updated_at` text DEFAULT '' NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `pages_external_page_id_unique` ON `pages` (`external_page_id`);--> statement-breakpoint
CREATE INDEX `pages_workspace_id_idx` ON `pages` (`workspace_id`);--> statement-breakpoint
ALTER TABLE `conversations` ADD `external_conversation_id` text;--> statement-breakpoint
ALTER TABLE `conversations` ADD `assigned_to_user_id` text;--> statement-breakpoint
ALTER TABLE `conversations` ADD `unread_count` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `conversations` ADD `priority` text DEFAULT 'normal' NOT NULL;--> statement-breakpoint
ALTER TABLE `conversations` ADD `last_message_preview` text;--> statement-breakpoint
ALTER TABLE `conversations` ADD `created_at` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `conversations` ADD `updated_at` text DEFAULT '' NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `conversations_external_conversation_unique` ON `conversations` (`page_id`,`external_conversation_id`);--> statement-breakpoint
CREATE INDEX `conversations_page_status_idx` ON `conversations` (`page_id`,`status`);--> statement-breakpoint
ALTER TABLE `messages` ADD `external_message_id` text;--> statement-breakpoint
ALTER TABLE `messages` ADD `page_id` text;--> statement-breakpoint
ALTER TABLE `messages` ADD `customer_id` text;--> statement-breakpoint
ALTER TABLE `messages` ADD `direction` text DEFAULT 'inbound' NOT NULL;--> statement-breakpoint
ALTER TABLE `messages` ADD `attachment_json` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `messages` ADD `raw_payload_json` text DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE `messages` ADD `delivery_status` text DEFAULT 'received' NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `messages_external_message_id_unique` ON `messages` (`external_message_id`);--> statement-breakpoint
CREATE INDEX `messages_conversation_created_idx` ON `messages` (`conversation_id`,`created_at`);--> statement-breakpoint
ALTER TABLE `comments` ADD `external_post_id` text;--> statement-breakpoint
ALTER TABLE `comments` ADD `parent_comment_id` text;--> statement-breakpoint
ALTER TABLE `comments` ADD `customer_id` text;--> statement-breakpoint
ALTER TABLE `comments` ADD `from_id` text;--> statement-breakpoint
ALTER TABLE `comments` ADD `from_name` text;--> statement-breakpoint
ALTER TABLE `comments` ADD `permalink_url` text;--> statement-breakpoint
ALTER TABLE `comments` ADD `raw_payload_json` text DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE `comments` ADD `replied` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `comments` ADD `assigned_to_user_id` text;--> statement-breakpoint
ALTER TABLE `comments` ADD `updated_at` text DEFAULT '' NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `comments_external_comment_id_unique` ON `comments` (`external_comment_id`);--> statement-breakpoint
CREATE INDEX `comments_page_replied_idx` ON `comments` (`page_id`,`replied`);--> statement-breakpoint
ALTER TABLE `customers` ADD `updated_at` text DEFAULT '' NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `customers_workspace_facebook_id_unique` ON `customers` (`workspace_id`,`facebook_id`);--> statement-breakpoint
CREATE TABLE `facebook_webhook_events` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`page_id` text,
	`event_type` text NOT NULL,
	`external_event_id` text NOT NULL,
	`raw_payload_json` text NOT NULL,
	`signature_valid` integer DEFAULT false NOT NULL,
	`processed` integer DEFAULT false NOT NULL,
	`error` text,
	`received_at` text NOT NULL,
	`processed_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `facebook_webhook_events_external_event_id_unique` ON `facebook_webhook_events` (`external_event_id`);--> statement-breakpoint
CREATE INDEX `facebook_webhook_events_processed_idx` ON `facebook_webhook_events` (`processed`);
