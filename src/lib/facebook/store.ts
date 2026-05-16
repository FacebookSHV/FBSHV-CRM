import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getFacebookRuntimeConfig } from "./env";
import type {
  CommentRecord,
  ConversationRecord,
  CustomerRecord,
  FacebookConnectionRecord,
  FacebookPageRecord,
  FacebookWebhookEventRecord,
  MessageRecord
} from "./types";
import { DEFAULT_WORKSPACE_ID } from "./types";

type D1Value = string | number | boolean | null;

type PageRow = {
  id: string;
  workspace_id: string;
  connection_id: string | null;
  external_page_id: string;
  name: string;
  page_access_token_encrypted: string | null;
  status: FacebookPageRecord["status"];
  token_status: FacebookPageRecord["tokenStatus"];
  subscribed_webhook: number;
  picture_url: string | null;
  synced_at: string | null;
  created_at: string;
  updated_at: string;
};

type ConversationRow = {
  id: string;
  workspace_id: string;
  page_id: string;
  customer_id: string | null;
  external_conversation_id: string | null;
  assigned_to_user_id: string | null;
  channel: ConversationRecord["channel"];
  status: ConversationRecord["status"];
  unread_count: number;
  priority: ConversationRecord["priority"];
  last_message_preview: string | null;
  last_message_at: string;
  created_at: string;
  updated_at: string;
};

type MessageRow = {
  id: string;
  conversation_id: string;
  external_message_id: string | null;
  page_id: string | null;
  customer_id: string | null;
  sender_type: MessageRecord["senderType"];
  direction: MessageRecord["direction"];
  body: string;
  attachment_json: string;
  raw_payload_json: string;
  delivery_status: MessageRecord["deliveryStatus"];
  created_at: string;
};

type CommentRow = {
  id: string;
  workspace_id: string;
  page_id: string;
  external_comment_id: string;
  external_post_id: string | null;
  parent_comment_id: string | null;
  customer_id: string | null;
  from_id: string | null;
  from_name: string | null;
  body: string;
  permalink_url: string | null;
  raw_payload_json: string;
  hidden: number;
  replied: number;
  assigned_to_user_id: string | null;
  created_at: string;
  updated_at: string;
};

export interface FacebookStore {
  listPages(workspaceId?: string): Promise<FacebookPageRecord[]>;
  getPage(pageId: string): Promise<FacebookPageRecord | null>;
  findPageByExternalId(externalPageId: string): Promise<FacebookPageRecord | null>;
  upsertConnection(record: FacebookConnectionRecord): Promise<void>;
  upsertPage(record: FacebookPageRecord): Promise<void>;
  updatePageState(pageId: string, patch: Partial<Pick<FacebookPageRecord, "subscribedWebhook" | "status" | "tokenStatus">>): Promise<void>;
  upsertCustomer(record: CustomerRecord): Promise<void>;
  upsertConversation(record: ConversationRecord): Promise<void>;
  listConversations(workspaceId?: string): Promise<ConversationRecord[]>;
  getConversation(conversationId: string): Promise<ConversationRecord | null>;
  upsertMessage(record: MessageRecord): Promise<void>;
  listMessages(conversationId: string): Promise<MessageRecord[]>;
  upsertComment(record: CommentRecord): Promise<void>;
  updateCommentState(commentId: string, patch: Partial<Pick<CommentRecord, "hidden" | "replied">>): Promise<void>;
  listComments(workspaceId?: string): Promise<CommentRecord[]>;
  saveWebhookEvent(record: FacebookWebhookEventRecord): Promise<{ inserted: boolean }>;
  markWebhookEventProcessed(eventId: string, error?: string): Promise<void>;
}

function nowIso() {
  return new Date().toISOString();
}

function createSeed() {
  const now = nowIso();
  const page: FacebookPageRecord = {
    id: "page_mock_shop_huy_van",
    workspaceId: DEFAULT_WORKSPACE_ID,
    connectionId: "conn_mock",
    externalPageId: "page_mock_shop_huy_van",
    name: "Shop Huy Vân",
    pageAccessTokenEncrypted: "mock:page",
    status: "mock",
    tokenStatus: "mock",
    subscribedWebhook: false,
    pictureUrl: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d",
    syncedAt: now,
    createdAt: now,
    updatedAt: now
  };
  const customer: CustomerRecord = {
    id: "customer_mock_minh_anh",
    workspaceId: DEFAULT_WORKSPACE_ID,
    name: "Nguyễn Minh Anh",
    facebookId: "fb_mock_customer_1",
    note: "Khách hỏi camera mini",
    createdAt: now,
    updatedAt: now
  };
  const conversation: ConversationRecord = {
    id: "conv_mock_camera",
    workspaceId: DEFAULT_WORKSPACE_ID,
    pageId: page.id,
    customerId: customer.id,
    externalConversationId: "page_mock_shop_huy_van:fb_mock_customer_1",
    channel: "messenger",
    status: "open",
    unreadCount: 1,
    priority: "high",
    lastMessagePreview: "Shop còn camera mini không?",
    lastMessageAt: now,
    createdAt: now,
    updatedAt: now
  };
  const message: MessageRecord = {
    id: "msg_mock_1",
    conversationId: conversation.id,
    externalMessageId: "mid_mock_1",
    pageId: page.id,
    customerId: customer.id,
    senderType: "customer",
    direction: "inbound",
    body: "Shop còn camera mini không?",
    attachmentJson: "[]",
    rawPayloadJson: "{}",
    deliveryStatus: "mock",
    createdAt: now
  };
  const comment: CommentRecord = {
    id: "comment_mock_1",
    workspaceId: DEFAULT_WORKSPACE_ID,
    pageId: page.id,
    externalCommentId: "comment_mock_1",
    externalPostId: "post_mock_camera",
    customerId: customer.id,
    fromId: customer.facebookId,
    fromName: customer.name,
    body: "Còn hàng không shop?",
    permalinkUrl: "https://facebook.com/mock/comment",
    rawPayloadJson: "{}",
    hidden: false,
    replied: false,
    createdAt: now,
    updatedAt: now
  };
  return { page, customer, conversation, message, comment };
}

export class MemoryFacebookStore implements FacebookStore {
  private connections = new Map<string, FacebookConnectionRecord>();
  private pages = new Map<string, FacebookPageRecord>();
  private customers = new Map<string, CustomerRecord>();
  private conversations = new Map<string, ConversationRecord>();
  private messages = new Map<string, MessageRecord>();
  private comments = new Map<string, CommentRecord>();
  private webhookEvents = new Map<string, FacebookWebhookEventRecord>();

  constructor(seed = true) {
    if (!seed) return;
    const data = createSeed();
    this.pages.set(data.page.id, data.page);
    this.customers.set(data.customer.id, data.customer);
    this.conversations.set(data.conversation.id, data.conversation);
    this.messages.set(data.message.id, data.message);
    this.comments.set(data.comment.id, data.comment);
  }

  resetForTests() {
    this.connections.clear();
    this.pages.clear();
    this.customers.clear();
    this.conversations.clear();
    this.messages.clear();
    this.comments.clear();
    this.webhookEvents.clear();
  }

  async listPages(workspaceId = DEFAULT_WORKSPACE_ID) {
    return [...this.pages.values()].filter((page) => page.workspaceId === workspaceId);
  }

  async getPage(pageId: string) {
    return this.pages.get(pageId) ?? null;
  }

  async findPageByExternalId(externalPageId: string) {
    return [...this.pages.values()].find((page) => page.externalPageId === externalPageId) ?? null;
  }

  async upsertConnection(record: FacebookConnectionRecord) {
    this.connections.set(record.id, record);
  }

  async upsertPage(record: FacebookPageRecord) {
    this.pages.set(record.id, record);
  }

  async updatePageState(pageId: string, patch: Partial<Pick<FacebookPageRecord, "subscribedWebhook" | "status" | "tokenStatus">>) {
    const current = this.pages.get(pageId);
    if (!current) return;
    this.pages.set(pageId, { ...current, ...patch, updatedAt: nowIso() });
  }

  async upsertCustomer(record: CustomerRecord) {
    this.customers.set(record.id, record);
  }

  async upsertConversation(record: ConversationRecord) {
    this.conversations.set(record.id, record);
  }

  async listConversations(workspaceId = DEFAULT_WORKSPACE_ID) {
    return [...this.conversations.values()]
      .filter((conversation) => conversation.workspaceId === workspaceId)
      .sort((a, b) => b.lastMessageAt.localeCompare(a.lastMessageAt));
  }

  async getConversation(conversationId: string) {
    return this.conversations.get(conversationId) ?? null;
  }

  async upsertMessage(record: MessageRecord) {
    const duplicate = [...this.messages.values()].find(
      (message) => record.externalMessageId && message.externalMessageId === record.externalMessageId
    );
    this.messages.set(duplicate?.id ?? record.id, duplicate ? { ...record, id: duplicate.id } : record);
  }

  async listMessages(conversationId: string) {
    return [...this.messages.values()]
      .filter((message) => message.conversationId === conversationId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  async upsertComment(record: CommentRecord) {
    const duplicate = [...this.comments.values()].find(
      (comment) => comment.externalCommentId === record.externalCommentId
    );
    this.comments.set(duplicate?.id ?? record.id, duplicate ? { ...record, id: duplicate.id } : record);
  }

  async updateCommentState(commentId: string, patch: Partial<Pick<CommentRecord, "hidden" | "replied">>) {
    const current = this.comments.get(commentId);
    if (!current) return;
    this.comments.set(commentId, { ...current, ...patch, updatedAt: nowIso() });
  }

  async listComments(workspaceId = DEFAULT_WORKSPACE_ID) {
    return [...this.comments.values()]
      .filter((comment) => comment.workspaceId === workspaceId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async saveWebhookEvent(record: FacebookWebhookEventRecord) {
    if (this.webhookEvents.has(record.externalEventId)) return { inserted: false };
    this.webhookEvents.set(record.externalEventId, record);
    return { inserted: true };
  }

  async markWebhookEventProcessed(eventId: string, error?: string) {
    const current = this.webhookEvents.get(eventId);
    if (!current) return;
    this.webhookEvents.set(eventId, {
      ...current,
      processed: !error,
      error,
      processedAt: nowIso()
    });
  }
}

class D1FacebookStore implements FacebookStore {
  constructor(private readonly db: D1Database) {}

  private async run(sql: string, ...values: D1Value[]) {
    await this.db.prepare(sql).bind(...values).run();
  }

  private async first<T>(sql: string, ...values: D1Value[]) {
    return this.db.prepare(sql).bind(...values).first<T>();
  }

  private async all<T>(sql: string, ...values: D1Value[]) {
    const result = await this.db.prepare(sql).bind(...values).all<T>();
    return result.results ?? [];
  }

  async listPages(workspaceId = DEFAULT_WORKSPACE_ID) {
    const rows = await this.all<PageRow>("select * from pages where workspace_id = ? order by updated_at desc", workspaceId);
    return rows.map(mapPageRow);
  }

  async getPage(pageId: string) {
    const row = await this.first<PageRow>("select * from pages where id = ?", pageId);
    return row ? mapPageRow(row) : null;
  }

  async findPageByExternalId(externalPageId: string) {
    const row = await this.first<PageRow>("select * from pages where external_page_id = ?", externalPageId);
    return row ? mapPageRow(row) : null;
  }

  async upsertConnection(record: FacebookConnectionRecord) {
    await this.run(
      `insert into facebook_connections
      (id, workspace_id, connected_by_user_id, facebook_user_id, access_token_encrypted, token_expires_at, scopes, status, created_at, updated_at)
      values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      on conflict(id) do update set access_token_encrypted = excluded.access_token_encrypted, token_expires_at = excluded.token_expires_at,
      scopes = excluded.scopes, status = excluded.status, updated_at = excluded.updated_at`,
      record.id,
      record.workspaceId,
      record.connectedByUserId ?? null,
      record.facebookUserId,
      record.accessTokenEncrypted,
      record.tokenExpiresAt ?? null,
      record.scopes,
      record.status,
      record.createdAt,
      record.updatedAt
    );
  }

  async upsertPage(record: FacebookPageRecord) {
    await this.run(
      `insert into pages
      (id, workspace_id, connection_id, external_page_id, name, page_access_token_encrypted, status, token_status, subscribed_webhook, picture_url, synced_at, created_at, updated_at)
      values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      on conflict(external_page_id) do update set connection_id = excluded.connection_id, name = excluded.name,
      page_access_token_encrypted = excluded.page_access_token_encrypted, status = excluded.status,
      token_status = excluded.token_status, subscribed_webhook = excluded.subscribed_webhook,
      picture_url = excluded.picture_url, synced_at = excluded.synced_at,
      updated_at = excluded.updated_at`,
      record.id,
      record.workspaceId,
      record.connectionId ?? null,
      record.externalPageId,
      record.name,
      record.pageAccessTokenEncrypted ?? null,
      record.status,
      record.tokenStatus,
      record.subscribedWebhook ? 1 : 0,
      record.pictureUrl ?? null,
      record.syncedAt ?? null,
      record.createdAt,
      record.updatedAt
    );
  }

  async updatePageState(pageId: string, patch: Partial<Pick<FacebookPageRecord, "subscribedWebhook" | "status" | "tokenStatus">>) {
    const current = await this.getPage(pageId);
    if (!current) return;
    await this.upsertPage({ ...current, ...patch, updatedAt: nowIso() });
  }

  async upsertCustomer(record: CustomerRecord) {
    await this.run(
      `insert into customers (id, workspace_id, name, phone, facebook_id, note, created_at, updated_at)
      values (?, ?, ?, ?, ?, ?, ?, ?)
      on conflict(id) do update set name = excluded.name, phone = excluded.phone, note = excluded.note, updated_at = excluded.updated_at`,
      record.id,
      record.workspaceId,
      record.name,
      record.phone ?? null,
      record.facebookId ?? null,
      record.note ?? null,
      record.createdAt,
      record.updatedAt
    );
  }

  async upsertConversation(record: ConversationRecord) {
    await this.run(
      `insert into conversations
      (id, workspace_id, page_id, customer_id, external_conversation_id, assigned_to_user_id, channel, status, unread_count, priority, last_message_preview, last_message_at, created_at, updated_at)
      values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      on conflict(id) do update set customer_id = excluded.customer_id, status = excluded.status, unread_count = excluded.unread_count,
      priority = excluded.priority, last_message_preview = excluded.last_message_preview, last_message_at = excluded.last_message_at,
      updated_at = excluded.updated_at`,
      record.id,
      record.workspaceId,
      record.pageId,
      record.customerId ?? null,
      record.externalConversationId ?? null,
      record.assignedToUserId ?? null,
      record.channel,
      record.status,
      record.unreadCount,
      record.priority,
      record.lastMessagePreview ?? null,
      record.lastMessageAt,
      record.createdAt,
      record.updatedAt
    );
  }

  async listConversations(workspaceId = DEFAULT_WORKSPACE_ID) {
    const rows = await this.all<ConversationRow>(
      "select * from conversations where workspace_id = ? order by last_message_at desc",
      workspaceId
    );
    return rows.map(mapConversationRow);
  }

  async getConversation(conversationId: string) {
    const row = await this.first<ConversationRow>("select * from conversations where id = ?", conversationId);
    return row ? mapConversationRow(row) : null;
  }

  async upsertMessage(record: MessageRecord) {
    await this.run(
      `insert into messages
      (id, conversation_id, external_message_id, page_id, customer_id, sender_type, direction, body, attachment_json, raw_payload_json, delivery_status, created_at)
      values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      on conflict(external_message_id) do nothing`,
      record.id,
      record.conversationId,
      record.externalMessageId ?? null,
      record.pageId ?? null,
      record.customerId ?? null,
      record.senderType,
      record.direction,
      record.body,
      record.attachmentJson,
      record.rawPayloadJson,
      record.deliveryStatus,
      record.createdAt
    );
  }

  async listMessages(conversationId: string) {
    const rows = await this.all<MessageRow>(
      "select * from messages where conversation_id = ? order by created_at asc",
      conversationId
    );
    return rows.map(mapMessageRow);
  }

  async upsertComment(record: CommentRecord) {
    await this.run(
      `insert into comments
      (id, workspace_id, page_id, external_comment_id, external_post_id, parent_comment_id, customer_id, from_id, from_name, body, permalink_url, raw_payload_json, hidden, replied, assigned_to_user_id, created_at, updated_at)
      values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      on conflict(external_comment_id) do update set body = excluded.body, hidden = excluded.hidden, replied = excluded.replied,
      assigned_to_user_id = excluded.assigned_to_user_id, updated_at = excluded.updated_at`,
      record.id,
      record.workspaceId,
      record.pageId,
      record.externalCommentId,
      record.externalPostId ?? null,
      record.parentCommentId ?? null,
      record.customerId ?? null,
      record.fromId ?? null,
      record.fromName ?? null,
      record.body,
      record.permalinkUrl ?? null,
      record.rawPayloadJson,
      record.hidden ? 1 : 0,
      record.replied ? 1 : 0,
      record.assignedToUserId ?? null,
      record.createdAt,
      record.updatedAt
    );
  }

  async updateCommentState(commentId: string, patch: Partial<Pick<CommentRecord, "hidden" | "replied">>) {
    const current = await this.first<CommentRow>("select * from comments where id = ?", commentId);
    if (!current) return;
    await this.upsertComment({ ...mapCommentRow(current), ...patch, updatedAt: nowIso() });
  }

  async listComments(workspaceId = DEFAULT_WORKSPACE_ID) {
    const rows = await this.all<CommentRow>(
      "select * from comments where workspace_id = ? order by created_at desc",
      workspaceId
    );
    return rows.map(mapCommentRow);
  }

  async saveWebhookEvent(record: FacebookWebhookEventRecord) {
    const result = await this.db
      .prepare(
        `insert or ignore into facebook_webhook_events
        (id, workspace_id, page_id, event_type, external_event_id, raw_payload_json, signature_valid, processed, error, received_at, processed_at)
        values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        record.id,
        record.workspaceId,
        record.pageId ?? null,
        record.eventType,
        record.externalEventId,
        record.rawPayloadJson,
        record.signatureValid ? 1 : 0,
        record.processed ? 1 : 0,
        record.error ?? null,
        record.receivedAt,
        record.processedAt ?? null
      )
      .run();
    return { inserted: result.meta.changes > 0 };
  }

  async markWebhookEventProcessed(eventId: string, error?: string) {
    await this.run(
      "update facebook_webhook_events set processed = ?, error = ?, processed_at = ? where external_event_id = ?",
      error ? 0 : 1,
      error ?? null,
      nowIso(),
      eventId
    );
  }
}

function mapPageRow(row: PageRow): FacebookPageRecord {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    connectionId: row.connection_id,
    externalPageId: row.external_page_id,
    name: row.name,
    pageAccessTokenEncrypted: row.page_access_token_encrypted,
    status: row.status,
    tokenStatus: row.token_status,
    subscribedWebhook: Boolean(row.subscribed_webhook),
    pictureUrl: row.picture_url,
    syncedAt: row.synced_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapConversationRow(row: ConversationRow): ConversationRecord {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    pageId: row.page_id,
    customerId: row.customer_id,
    externalConversationId: row.external_conversation_id,
    assignedToUserId: row.assigned_to_user_id,
    channel: row.channel,
    status: row.status,
    unreadCount: row.unread_count,
    priority: row.priority,
    lastMessagePreview: row.last_message_preview,
    lastMessageAt: row.last_message_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapMessageRow(row: MessageRow): MessageRecord {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    externalMessageId: row.external_message_id,
    pageId: row.page_id,
    customerId: row.customer_id,
    senderType: row.sender_type,
    direction: row.direction,
    body: row.body,
    attachmentJson: row.attachment_json,
    rawPayloadJson: row.raw_payload_json,
    deliveryStatus: row.delivery_status,
    createdAt: row.created_at
  };
}

function mapCommentRow(row: CommentRow): CommentRecord {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    pageId: row.page_id,
    externalCommentId: row.external_comment_id,
    externalPostId: row.external_post_id,
    parentCommentId: row.parent_comment_id,
    customerId: row.customer_id,
    fromId: row.from_id,
    fromName: row.from_name,
    body: row.body,
    permalinkUrl: row.permalink_url,
    rawPayloadJson: row.raw_payload_json,
    hidden: Boolean(row.hidden),
    replied: Boolean(row.replied),
    assignedToUserId: row.assigned_to_user_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

const memoryStore = new MemoryFacebookStore();

export async function getFacebookStore(): Promise<FacebookStore> {
  try {
    const context = await getCloudflareContext({ async: true });
    const db = (context.env as { DB?: D1Database }).DB;
    if (db) return new D1FacebookStore(db);
  } catch {
    // NEO: Local dev/test không có D1 binding thì dùng store mock an toàn.
  }

  if (getFacebookRuntimeConfig().mode === "real") {
    throw new Error("BLOCKED_BY_MISSING_BINDING: DB");
  }

  return memoryStore;
}

export function getMemoryFacebookStoreForTests() {
  return memoryStore;
}
