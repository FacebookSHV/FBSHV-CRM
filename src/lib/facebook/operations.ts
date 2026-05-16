import { createFacebookClient } from "./client";
import { assertFacebookReady, getFacebookRuntimeConfig } from "./env";
import { intentFromOAuthState, scopesForOAuthIntent } from "./oauth";
import { createMockEncryptedToken, decryptToken, encryptToken } from "./token-crypto";
import type {
  CommentRecord,
  ConversationRecord,
  FacebookPageRecord,
  FacebookRuntimeConfig,
  MessageRecord,
  ParsedFacebookCommentEvent,
  ParsedFacebookMessageEvent,
  ParsedFacebookWebhookEvent
} from "./types";
import { DEFAULT_USER_ID, DEFAULT_WORKSPACE_ID } from "./types";
import { getFacebookStore } from "./store";
import { withMetaPermission } from "./permissions";

function nowIso() {
  return new Date().toISOString();
}

function idFrom(prefix: string, value: string) {
  return `${prefix}_${value.replace(/[^A-Za-z0-9_-]/g, "_")}`;
}

export async function connectFacebookFromCode(code: string, state?: string) {
  const config = getFacebookRuntimeConfig();
  const readiness = assertFacebookReady(config);
  if (!readiness.ok) return { success: false as const, error: readiness.error };

  const client = createFacebookClient(config);
  const token = await client.exchangeCodeForUserToken(code);
  const pages = await client.listPages(token.accessToken);
  const now = nowIso();
  const store = await getFacebookStore();
  const workspaceId = state?.startsWith("workspace:") ? state.split(":")[1] || DEFAULT_WORKSPACE_ID : DEFAULT_WORKSPACE_ID;
  const requestedScopes = scopesForOAuthIntent(intentFromOAuthState(state));
  const connectionId = config.mode === "mock" ? "conn_mock" : crypto.randomUUID();
  const accessTokenEncrypted =
    config.mode === "mock" ? createMockEncryptedToken("user") : await encryptToken(token.accessToken, config.encryptionKey);

  await store.upsertConnection({
    id: connectionId,
    workspaceId,
    connectedByUserId: DEFAULT_USER_ID,
    facebookUserId: config.mode === "mock" ? "fb_user_mock" : "fb_user_connected",
    accessTokenEncrypted,
    tokenExpiresAt: token.expiresAt,
    // NEO: Quyền quảng cáo nằm chung OAuth để quản lý ad account sau khi Meta duyệt scope.
    scopes: requestedScopes.join(","),
    status: config.mode === "mock" ? "mock" : "active",
    createdAt: now,
    updatedAt: now
  });

  for (const page of pages) {
    const pageAccessTokenEncrypted =
      config.mode === "mock" ? createMockEncryptedToken(page.id) : await encryptToken(page.accessToken, config.encryptionKey);

    await store.upsertPage({
      id: page.id,
      workspaceId,
      connectionId,
      externalPageId: page.id,
      name: page.name,
      pageAccessTokenEncrypted,
      status: config.mode === "mock" ? "mock" : "connected",
      tokenStatus: config.mode === "mock" ? "mock" : "valid",
      subscribedWebhook: false,
      pictureUrl: page.pictureUrl,
      syncedAt: now,
      createdAt: now,
      updatedAt: now
    });
  }

  return { success: true as const, data: { pages: pages.length, mode: config.mode } };
}

async function getPageToken(page: FacebookPageRecord, config: FacebookRuntimeConfig) {
  if (config.mode === "mock") return "mock-page-token";
  if (!page.pageAccessTokenEncrypted) throw new Error("BLOCKED_BY_MISSING_SECRET: PAGE_ACCESS_TOKEN");
  return decryptToken(page.pageAccessTokenEncrypted, config.encryptionKey);
}

export async function subscribeFacebookPage(pageId: string) {
  const config = getFacebookRuntimeConfig();
  const readiness = assertFacebookReady(config);
  if (!readiness.ok) return { success: false as const, error: readiness.error };

  const store = await getFacebookStore();
  const page = await store.getPage(pageId);
  if (!page) return { success: false as const, error: "Không tìm thấy fanpage." };

  const token = await getPageToken(page, config);
  const client = createFacebookClient(config);
  await client.subscribePage(page.externalPageId, token);
  await store.updatePageState(page.id, { subscribedWebhook: true, tokenStatus: config.mode === "mock" ? "mock" : "valid" });
  return { success: true as const, data: { pageId: page.id, subscribedWebhook: true, mode: config.mode } };
}

export async function disconnectFacebook(pageId?: string) {
  const store = await getFacebookStore();
  const pages = pageId ? [await store.getPage(pageId)].filter(Boolean) : await store.listPages();

  for (const page of pages) {
    await store.updatePageState(page!.id, {
      status: "disconnected",
      tokenStatus: "revoked",
      subscribedWebhook: false
    });
  }

  return { success: true as const, data: { disconnected: pages.length } };
}

async function ensurePage(storePageExternalId: string) {
  const store = await getFacebookStore();
  const existing = await store.findPageByExternalId(storePageExternalId);
  if (existing) return existing;

  const now = nowIso();
  const page: FacebookPageRecord = {
    id: storePageExternalId,
    workspaceId: DEFAULT_WORKSPACE_ID,
    externalPageId: storePageExternalId,
    name: `Fanpage ${storePageExternalId}`,
    status: "mock",
    tokenStatus: "missing",
    subscribedWebhook: false,
    createdAt: now,
    updatedAt: now,
    syncedAt: now
  };
  await store.upsertPage(page);
  return page;
}

async function processMessageEvent(event: ParsedFacebookMessageEvent, signatureValid: boolean) {
  const store = await getFacebookStore();
  const page = await ensurePage(event.pageExternalId);
  const now = nowIso();
  const customerId = idFrom("customer", event.senderId);
  const conversationId = idFrom("conv", `${event.pageExternalId}_${event.senderId}`);

  await store.upsertCustomer({
    id: customerId,
    workspaceId: DEFAULT_WORKSPACE_ID,
    name: `Facebook ${event.senderId}`,
    facebookId: event.senderId,
    createdAt: now,
    updatedAt: now
  });

  const conversation: ConversationRecord = {
    id: conversationId,
    workspaceId: DEFAULT_WORKSPACE_ID,
    pageId: page.id,
    customerId,
    externalConversationId: `${event.pageExternalId}:${event.senderId}`,
    channel: "messenger",
    status: "open",
    unreadCount: 1,
    priority: "normal",
    lastMessagePreview: event.text || "[attachment]",
    lastMessageAt: event.createdAt,
    createdAt: now,
    updatedAt: now
  };
  await store.upsertConversation(conversation);

  const message: MessageRecord = {
    id: idFrom("msg", event.externalEventId),
    conversationId,
    externalMessageId: event.externalEventId,
    pageId: page.id,
    customerId,
    senderType: "customer",
    direction: "inbound",
    body: event.text || "[attachment]",
    attachmentJson: JSON.stringify(event.attachments),
    rawPayloadJson: JSON.stringify(event.raw),
    deliveryStatus: signatureValid ? "received" : "mock",
    createdAt: event.createdAt
  };
  await store.upsertMessage(message);
  return page.id;
}

async function processCommentEvent(event: ParsedFacebookCommentEvent, signatureValid: boolean) {
  const store = await getFacebookStore();
  const page = await ensurePage(event.pageExternalId);
  const now = nowIso();
  const customerId = event.fromId ? idFrom("customer", event.fromId) : undefined;

  if (customerId) {
    await store.upsertCustomer({
      id: customerId,
      workspaceId: DEFAULT_WORKSPACE_ID,
      name: event.fromName || `Facebook ${event.fromId}`,
      facebookId: event.fromId,
      createdAt: now,
      updatedAt: now
    });
  }

  const comment: CommentRecord = {
    id: idFrom("comment", event.externalCommentId),
    workspaceId: DEFAULT_WORKSPACE_ID,
    pageId: page.id,
    externalCommentId: event.externalCommentId,
    externalPostId: event.externalPostId,
    parentCommentId: event.parentCommentId,
    customerId,
    fromId: event.fromId,
    fromName: event.fromName,
    body: event.message,
    permalinkUrl: event.permalinkUrl,
    rawPayloadJson: JSON.stringify({ ...event.raw, signatureValid }),
    hidden: false,
    replied: false,
    createdAt: event.createdAt,
    updatedAt: now
  };
  await store.upsertComment(comment);
  return page.id;
}

export async function persistParsedFacebookEvent(event: ParsedFacebookWebhookEvent, signatureValid: boolean) {
  const store = await getFacebookStore();
  const eventType = event.kind;
  const externalEventId = event.kind === "comment" ? event.externalCommentId : event.externalEventId;
  const receivedAt = nowIso();
  const page = await ensurePage(event.pageExternalId);
  const saved = await store.saveWebhookEvent({
    id: crypto.randomUUID(),
    workspaceId: DEFAULT_WORKSPACE_ID,
    pageId: page.id,
    eventType,
    externalEventId,
    rawPayloadJson: JSON.stringify(event.raw),
    signatureValid,
    processed: false,
    receivedAt
  });

  if (!saved.inserted) return { duplicate: true, eventType, externalEventId };

  try {
    const pageId =
      event.kind === "comment"
        ? await processCommentEvent(event, signatureValid)
        : await processMessageEvent(event, signatureValid);
    await store.markWebhookEventProcessed(externalEventId);
    return { duplicate: false, eventType, externalEventId, pageId };
  } catch (error) {
    await store.markWebhookEventProcessed(externalEventId, error instanceof Error ? error.message : "Webhook lỗi không xác định");
    throw error;
  }
}

export async function sendMessengerReply(conversationId: string, message: string) {
  const config = getFacebookRuntimeConfig();
  const readiness = assertFacebookReady(config);
  if (!readiness.ok) return { success: false as const, error: readiness.error };

  const store = await getFacebookStore();
  const conversation = await store.getConversation(conversationId);
  if (!conversation) return { success: false as const, error: "Không tìm thấy hội thoại." };
  const page = await store.getPage(conversation.pageId);
  if (!page) return { success: false as const, error: "Không tìm thấy fanpage." };

  const token = await getPageToken(page, config);
  const recipientId = conversation.externalConversationId?.split(":")[1] || conversation.customerId || "";
  if (!recipientId) return { success: false as const, error: "Thiếu Facebook recipient id." };

  const result = await withMetaPermission("pages_messaging", () =>
    createFacebookClient(config).sendMessage(page.externalPageId, token, recipientId, message)
  );
  const now = nowIso();
  await store.upsertMessage({
    id: crypto.randomUUID(),
    conversationId,
    externalMessageId: result.externalId,
    pageId: page.id,
    customerId: conversation.customerId,
    senderType: "page",
    direction: "outbound",
    body: message,
    attachmentJson: "[]",
    rawPayloadJson: JSON.stringify({ mock: result.mock }),
    deliveryStatus: result.mock ? "mock" : "sent",
    createdAt: now
  });
  await store.upsertConversation({
    ...conversation,
    unreadCount: 0,
    lastMessagePreview: message,
    lastMessageAt: now,
    updatedAt: now
  });

  return { success: true as const, data: { messageId: result.externalId, mock: result.mock } };
}

export async function replyFacebookComment(commentId: string, message: string) {
  const config = getFacebookRuntimeConfig();
  const readiness = assertFacebookReady(config);
  if (!readiness.ok) return { success: false as const, error: readiness.error };

  const store = await getFacebookStore();
  const comment = (await store.listComments()).find((item) => item.id === commentId || item.externalCommentId === commentId);
  if (!comment) return { success: false as const, error: "Không tìm thấy bình luận." };
  const page = await store.getPage(comment.pageId);
  if (!page) return { success: false as const, error: "Không tìm thấy fanpage." };

  const token = await getPageToken(page, config);
  const result = await withMetaPermission("pages_manage_engagement", () =>
    createFacebookClient(config).replyComment(token, comment.externalCommentId, message)
  );
  await store.updateCommentState(comment.id, { replied: true });
  return { success: true as const, data: { replyId: result.externalId, mock: result.mock } };
}

export async function setFacebookCommentHidden(commentId: string, hidden: boolean) {
  const config = getFacebookRuntimeConfig();
  const readiness = assertFacebookReady(config);
  if (!readiness.ok) return { success: false as const, error: readiness.error };

  const store = await getFacebookStore();
  const comment = (await store.listComments()).find((item) => item.id === commentId || item.externalCommentId === commentId);
  if (!comment) return { success: false as const, error: "Không tìm thấy bình luận." };
  const page = await store.getPage(comment.pageId);
  if (!page) return { success: false as const, error: "Không tìm thấy fanpage." };

  const token = await getPageToken(page, config);
  const result = await withMetaPermission("pages_manage_engagement", () =>
    createFacebookClient(config).setCommentHidden(token, comment.externalCommentId, hidden)
  );
  await store.updateCommentState(comment.id, { hidden });
  return { success: true as const, data: { actionId: result.externalId, hidden, mock: result.mock } };
}
