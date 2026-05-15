import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const facebookConnections = sqliteTable(
  "facebook_connections",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id").notNull(),
    connectedByUserId: text("connected_by_user_id"),
    facebookUserId: text("facebook_user_id").notNull(),
    accessTokenEncrypted: text("access_token_encrypted").notNull(),
    tokenExpiresAt: text("token_expires_at"),
    scopes: text("scopes").notNull().default(""),
    status: text("status").notNull().default("active"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull()
  },
  (table) => ({
    workspaceUserIdx: uniqueIndex("facebook_connections_workspace_user_unique").on(
      table.workspaceId,
      table.facebookUserId
    )
  })
);

export const pages = sqliteTable(
  "pages",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id").notNull(),
    connectionId: text("connection_id"),
    externalPageId: text("external_page_id").notNull(),
    name: text("name").notNull(),
    pageAccessTokenEncrypted: text("page_access_token_encrypted"),
    status: text("status").notNull().default("mock"),
    tokenStatus: text("token_status").notNull().default("missing"),
    subscribedWebhook: integer("subscribed_webhook", { mode: "boolean" }).notNull().default(false),
    pictureUrl: text("picture_url"),
    syncedAt: text("synced_at"),
    createdAt: text("created_at").notNull().default(""),
    updatedAt: text("updated_at").notNull().default("")
  },
  (table) => ({
    externalPageIdx: uniqueIndex("pages_external_page_id_unique").on(table.externalPageId),
    workspaceIdx: index("pages_workspace_id_idx").on(table.workspaceId)
  })
);

export const conversations = sqliteTable(
  "conversations",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id").notNull(),
    pageId: text("page_id").notNull(),
    customerId: text("customer_id"),
    externalConversationId: text("external_conversation_id"),
    assignedToUserId: text("assigned_to_user_id"),
    channel: text("channel").notNull().default("messenger"),
    status: text("status").notNull().default("open"),
    unreadCount: integer("unread_count").notNull().default(0),
    priority: text("priority").notNull().default("normal"),
    lastMessagePreview: text("last_message_preview"),
    lastMessageAt: text("last_message_at").notNull(),
    createdAt: text("created_at").notNull().default(""),
    updatedAt: text("updated_at").notNull().default("")
  },
  (table) => ({
    externalConversationIdx: uniqueIndex("conversations_external_conversation_unique").on(
      table.pageId,
      table.externalConversationId
    ),
    pageStatusIdx: index("conversations_page_status_idx").on(table.pageId, table.status)
  })
);

export const messages = sqliteTable(
  "messages",
  {
    id: text("id").primaryKey(),
    conversationId: text("conversation_id").notNull(),
    externalMessageId: text("external_message_id"),
    pageId: text("page_id"),
    customerId: text("customer_id"),
    senderType: text("sender_type").notNull(),
    direction: text("direction").notNull().default("inbound"),
    body: text("body").notNull(),
    attachmentJson: text("attachment_json").notNull().default("[]"),
    rawPayloadJson: text("raw_payload_json").notNull().default("{}"),
    deliveryStatus: text("delivery_status").notNull().default("received"),
    createdAt: text("created_at").notNull()
  },
  (table) => ({
    externalMessageIdx: uniqueIndex("messages_external_message_id_unique").on(table.externalMessageId),
    conversationCreatedIdx: index("messages_conversation_created_idx").on(table.conversationId, table.createdAt)
  })
);

export const comments = sqliteTable(
  "comments",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id").notNull(),
    pageId: text("page_id").notNull(),
    externalCommentId: text("external_comment_id").notNull(),
    externalPostId: text("external_post_id"),
    parentCommentId: text("parent_comment_id"),
    customerId: text("customer_id"),
    fromId: text("from_id"),
    fromName: text("from_name"),
    body: text("body").notNull(),
    permalinkUrl: text("permalink_url"),
    rawPayloadJson: text("raw_payload_json").notNull().default("{}"),
    hidden: integer("hidden", { mode: "boolean" }).notNull().default(false),
    replied: integer("replied", { mode: "boolean" }).notNull().default(false),
    assignedToUserId: text("assigned_to_user_id"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull().default("")
  },
  (table) => ({
    externalCommentIdx: uniqueIndex("comments_external_comment_id_unique").on(table.externalCommentId),
    pageRepliedIdx: index("comments_page_replied_idx").on(table.pageId, table.replied)
  })
);

export const customers = sqliteTable(
  "customers",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id").notNull(),
    name: text("name").notNull(),
    phone: text("phone"),
    facebookId: text("facebook_id"),
    note: text("note"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull().default("")
  },
  (table) => ({
    facebookCustomerIdx: uniqueIndex("customers_workspace_facebook_id_unique").on(
      table.workspaceId,
      table.facebookId
    )
  })
);

export const customerTags = sqliteTable("customer_tags", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull(),
  customerId: text("customer_id").notNull(),
  tag: text("tag").notNull(),
  createdAt: text("created_at").notNull()
});

export const customerInteractions = sqliteTable("customer_interactions", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull(),
  customerId: text("customer_id").notNull(),
  type: text("type").notNull(),
  summary: text("summary").notNull(),
  createdAt: text("created_at").notNull()
});

export const facebookWebhookEvents = sqliteTable(
  "facebook_webhook_events",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id").notNull(),
    pageId: text("page_id"),
    eventType: text("event_type").notNull(),
    externalEventId: text("external_event_id").notNull(),
    rawPayloadJson: text("raw_payload_json").notNull(),
    signatureValid: integer("signature_valid", { mode: "boolean" }).notNull().default(false),
    processed: integer("processed", { mode: "boolean" }).notNull().default(false),
    error: text("error"),
    receivedAt: text("received_at").notNull(),
    processedAt: text("processed_at")
  },
  (table) => ({
    externalEventIdx: uniqueIndex("facebook_webhook_events_external_event_id_unique").on(
      table.externalEventId
    ),
    processedIdx: index("facebook_webhook_events_processed_idx").on(table.processed)
  })
);
