import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const productCache = sqliteTable("product_cache", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull(),
  externalProductId: text("external_product_id").notNull(),
  sku: text("sku").notNull().unique(),
  name: text("name").notNull(),
  category: text("category"),
  costPrice: integer("cost_price").notNull().default(0),
  originalPrice: integer("original_price").notNull().default(0),
  salePrice: integer("sale_price").notNull().default(0),
  currentPrice: integer("current_price").notNull().default(0),
  discountAmount: integer("discount_amount").notNull().default(0),
  discountPercent: real("discount_percent").notNull().default(0),
  currency: text("currency").notNull().default("VND"),
  imageUrl: text("image_url"),
  description: text("description"),
  status: text("status").notNull().default("active"),
  priceUpdatedAt: text("price_updated_at"),
  syncedAt: text("synced_at").notNull()
});

export const inventoryCache = sqliteTable("inventory_cache", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull(),
  sku: text("sku").notNull(),
  stock: integer("stock").notNull().default(0),
  availableStock: integer("available_stock").notNull().default(0),
  reservedStock: integer("reserved_stock").notNull().default(0),
  lowStockThreshold: integer("low_stock_threshold").notNull().default(10),
  syncedAt: text("synced_at").notNull()
});

export const productSyncLogs = sqliteTable("product_sync_logs", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull(),
  source: text("source").notNull(),
  status: text("status").notNull(),
  syncedCount: integer("synced_count").notNull().default(0),
  error: text("error"),
  createdAt: text("created_at").notNull()
});

export const ecommerceWebhookEvents = sqliteTable("ecommerce_webhook_events", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id"),
  externalEventId: text("external_event_id").notNull(),
  type: text("type").notNull(),
  payloadJson: text("payload_json").notNull(),
  status: text("status").notNull().default("received"),
  createdAt: text("created_at").notNull()
});
