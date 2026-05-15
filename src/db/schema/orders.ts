import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const orders = sqliteTable("orders", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull(),
  customerId: text("customer_id").notNull(),
  conversationId: text("conversation_id"),
  status: text("status").notNull().default("pending"),
  totalAmount: integer("total_amount").notNull().default(0),
  currency: text("currency").notNull().default("VND"),
  externalOrderId: text("external_order_id"),
  createdAt: text("created_at").notNull()
});

export const orderItems = sqliteTable("order_items", {
  id: text("id").primaryKey(),
  orderId: text("order_id").notNull(),
  sku: text("sku").notNull(),
  name: text("name").notNull(),
  quantity: integer("quantity").notNull(),
  unitPrice: integer("unit_price").notNull(),
  totalPrice: integer("total_price").notNull()
});

export const externalOrderReferences = sqliteTable("external_order_references", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull(),
  orderId: text("order_id").notNull(),
  externalOrderId: text("external_order_id").notNull(),
  provider: text("provider").notNull().default("ecommerce-management"),
  status: text("status").notNull(),
  createdAt: text("created_at").notNull()
});

export const inventoryReservationReferences = sqliteTable("inventory_reservation_references", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull(),
  orderId: text("order_id"),
  sku: text("sku").notNull(),
  quantity: integer("quantity").notNull(),
  externalReservationId: text("external_reservation_id").notNull(),
  status: text("status").notNull(),
  expiresAt: text("expires_at"),
  createdAt: text("created_at").notNull()
});
