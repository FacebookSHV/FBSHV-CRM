import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  role: text("role").notNull().default("operator"),
  createdAt: text("created_at").notNull()
});

export const workspaces = sqliteTable("workspaces", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  createdAt: text("created_at").notNull()
});

export const workspaceMembers = sqliteTable("workspace_members", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull(),
  userId: text("user_id").notNull(),
  role: text("role").notNull().default("member"),
  joinedAt: text("joined_at").notNull()
});

export const integrations = sqliteTable("integrations", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull(),
  provider: text("provider").notNull(),
  status: text("status").notNull().default("mock"),
  configJson: text("config_json").notNull().default("{}"),
  updatedAt: text("updated_at").notNull()
});

export const auditLogs = sqliteTable("audit_logs", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull(),
  actorId: text("actor_id"),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id"),
  metadataJson: text("metadata_json").notNull().default("{}"),
  createdAt: text("created_at").notNull()
});

export const reports = sqliteTable("reports", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  configJson: text("config_json").notNull().default("{}"),
  createdAt: text("created_at").notNull()
});

export const aiGenerations = sqliteTable("ai_generations", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull(),
  productSku: text("product_sku"),
  promptType: text("prompt_type").notNull(),
  output: text("output").notNull(),
  tokenCount: integer("token_count").notNull().default(0),
  createdAt: text("created_at").notNull()
});
