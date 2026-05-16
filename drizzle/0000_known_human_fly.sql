CREATE TABLE `ad_accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`external_account_id` text NOT NULL,
	`name` text NOT NULL,
	`status` text DEFAULT 'mock' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `ad_metric_daily` (
	`id` text PRIMARY KEY NOT NULL,
	`ad_id` text NOT NULL,
	`date` text NOT NULL,
	`spend` integer DEFAULT 0 NOT NULL,
	`impressions` integer DEFAULT 0 NOT NULL,
	`clicks` integer DEFAULT 0 NOT NULL,
	`conversions` integer DEFAULT 0 NOT NULL,
	`roas` real DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `ad_sets` (
	`id` text PRIMARY KEY NOT NULL,
	`campaign_id` text NOT NULL,
	`external_ad_set_id` text NOT NULL,
	`name` text NOT NULL,
	`budget` integer DEFAULT 0 NOT NULL,
	`status` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `ads` (
	`id` text PRIMARY KEY NOT NULL,
	`ad_set_id` text NOT NULL,
	`external_ad_id` text NOT NULL,
	`name` text NOT NULL,
	`creative_json` text DEFAULT '{}' NOT NULL,
	`status` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `campaigns` (
	`id` text PRIMARY KEY NOT NULL,
	`ad_account_id` text NOT NULL,
	`external_campaign_id` text NOT NULL,
	`name` text NOT NULL,
	`status` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `automation_actions` (
	`id` text PRIMARY KEY NOT NULL,
	`rule_id` text NOT NULL,
	`action_type` text NOT NULL,
	`config_json` text DEFAULT '{}' NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `automation_rules` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`name` text NOT NULL,
	`trigger_type` text NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `webhook_events` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text,
	`provider` text NOT NULL,
	`event_type` text NOT NULL,
	`payload_json` text NOT NULL,
	`status` text DEFAULT 'received' NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `ai_generations` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`product_sku` text,
	`prompt_type` text NOT NULL,
	`output` text NOT NULL,
	`token_count` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `audit_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`actor_id` text,
	`action` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text,
	`metadata_json` text DEFAULT '{}' NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `integrations` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`provider` text NOT NULL,
	`status` text DEFAULT 'mock' NOT NULL,
	`config_json` text DEFAULT '{}' NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `reports` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`config_json` text DEFAULT '{}' NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`role` text DEFAULT 'operator' NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE TABLE `workspace_members` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`user_id` text NOT NULL,
	`role` text DEFAULT 'member' NOT NULL,
	`joined_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `workspaces` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `workspaces_slug_unique` ON `workspaces` (`slug`);--> statement-breakpoint
CREATE TABLE `external_order_references` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`order_id` text NOT NULL,
	`external_order_id` text NOT NULL,
	`provider` text DEFAULT 'ecommerce-management' NOT NULL,
	`status` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `inventory_reservation_references` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`order_id` text,
	`sku` text NOT NULL,
	`quantity` integer NOT NULL,
	`external_reservation_id` text NOT NULL,
	`status` text NOT NULL,
	`expires_at` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `order_items` (
	`id` text PRIMARY KEY NOT NULL,
	`order_id` text NOT NULL,
	`sku` text NOT NULL,
	`name` text NOT NULL,
	`quantity` integer NOT NULL,
	`unit_price` integer NOT NULL,
	`total_price` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `orders` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`customer_id` text NOT NULL,
	`conversation_id` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`total_amount` integer DEFAULT 0 NOT NULL,
	`currency` text DEFAULT 'VND' NOT NULL,
	`external_order_id` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `ecommerce_webhook_events` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text,
	`external_event_id` text NOT NULL,
	`type` text NOT NULL,
	`payload_json` text NOT NULL,
	`status` text DEFAULT 'received' NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `inventory_cache` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`sku` text NOT NULL,
	`stock` integer DEFAULT 0 NOT NULL,
	`available_stock` integer DEFAULT 0 NOT NULL,
	`reserved_stock` integer DEFAULT 0 NOT NULL,
	`low_stock_threshold` integer DEFAULT 10 NOT NULL,
	`synced_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `product_cache` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`external_product_id` text NOT NULL,
	`sku` text NOT NULL,
	`name` text NOT NULL,
	`category` text,
	`cost_price` integer DEFAULT 0 NOT NULL,
	`original_price` integer DEFAULT 0 NOT NULL,
	`sale_price` integer DEFAULT 0 NOT NULL,
	`current_price` integer DEFAULT 0 NOT NULL,
	`discount_amount` integer DEFAULT 0 NOT NULL,
	`discount_percent` real DEFAULT 0 NOT NULL,
	`currency` text DEFAULT 'VND' NOT NULL,
	`image_url` text,
	`description` text,
	`status` text DEFAULT 'active' NOT NULL,
	`price_updated_at` text,
	`synced_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `product_cache_sku_unique` ON `product_cache` (`sku`);--> statement-breakpoint
CREATE TABLE `product_sync_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`source` text NOT NULL,
	`status` text NOT NULL,
	`synced_count` integer DEFAULT 0 NOT NULL,
	`error` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `comments` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`page_id` text NOT NULL,
	`external_comment_id` text NOT NULL,
	`body` text NOT NULL,
	`hidden` integer DEFAULT false NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `conversations` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`page_id` text NOT NULL,
	`customer_id` text,
	`channel` text DEFAULT 'messenger' NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`last_message_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `customer_interactions` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`customer_id` text NOT NULL,
	`type` text NOT NULL,
	`summary` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `customer_tags` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`customer_id` text NOT NULL,
	`tag` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `customers` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`name` text NOT NULL,
	`phone` text,
	`facebook_id` text,
	`note` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `messages` (
	`id` text PRIMARY KEY NOT NULL,
	`conversation_id` text NOT NULL,
	`sender_type` text NOT NULL,
	`body` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `pages` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`external_page_id` text NOT NULL,
	`name` text NOT NULL,
	`status` text DEFAULT 'mock' NOT NULL,
	`token_status` text DEFAULT 'missing' NOT NULL,
	`synced_at` text
);
