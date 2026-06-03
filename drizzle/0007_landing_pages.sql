CREATE TABLE `landing_pages` (
  `id` text PRIMARY KEY NOT NULL,
  `workspace_id` text NOT NULL,
  `slug` text NOT NULL,
  `title` text NOT NULL,
  `product_sku` text NOT NULL,
  `template_id` text NOT NULL,
  `status` text DEFAULT 'draft' NOT NULL,
  `hero_json` text DEFAULT '{}' NOT NULL,
  `sections_json` text DEFAULT '{}' NOT NULL,
  `seo_json` text DEFAULT '{}' NOT NULL,
  `created_at` text NOT NULL,
  `updated_at` text NOT NULL,
  `published_at` text
);
CREATE UNIQUE INDEX `landing_pages_slug_unique` ON `landing_pages` (`slug`);
CREATE INDEX `landing_pages_status_idx` ON `landing_pages` (`workspace_id`, `status`);

CREATE TABLE `landing_page_variants` (
  `id` text PRIMARY KEY NOT NULL,
  `workspace_id` text NOT NULL,
  `landing_page_id` text NOT NULL,
  `variant_key` text NOT NULL,
  `name` text NOT NULL,
  `weight` integer DEFAULT 100 NOT NULL,
  `template_id` text NOT NULL,
  `content_json` text DEFAULT '{}' NOT NULL,
  `status` text DEFAULT 'active' NOT NULL,
  `created_at` text NOT NULL,
  `updated_at` text NOT NULL
);
CREATE UNIQUE INDEX `landing_page_variants_key_unique` ON `landing_page_variants` (`landing_page_id`, `variant_key`);
CREATE INDEX `landing_page_variants_page_idx` ON `landing_page_variants` (`landing_page_id`, `status`);

CREATE TABLE `landing_page_events` (
  `id` text PRIMARY KEY NOT NULL,
  `workspace_id` text NOT NULL,
  `landing_page_id` text NOT NULL,
  `variant_id` text,
  `event_id` text NOT NULL,
  `event_name` text NOT NULL,
  `visitor_id` text,
  `source_url` text,
  `user_data_json` text DEFAULT '{}' NOT NULL,
  `custom_data_json` text DEFAULT '{}' NOT NULL,
  `capi_status` text DEFAULT 'not_sent' NOT NULL,
  `capi_error` text,
  `created_at` text NOT NULL
);
CREATE UNIQUE INDEX `landing_page_events_event_id_unique` ON `landing_page_events` (`event_id`);
CREATE INDEX `landing_page_events_page_event_idx` ON `landing_page_events` (`landing_page_id`, `event_name`, `created_at`);
