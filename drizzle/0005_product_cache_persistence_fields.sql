ALTER TABLE `product_cache` ADD COLUMN `source` text DEFAULT 'ecommerce_external_products' NOT NULL;
--> statement-breakpoint
ALTER TABLE `product_cache` ADD COLUMN `raw_payload_json` text DEFAULT '{}' NOT NULL;
--> statement-breakpoint
ALTER TABLE `product_cache` ADD COLUMN `missing_from_source` integer DEFAULT false NOT NULL;
