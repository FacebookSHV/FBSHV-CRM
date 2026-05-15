export const DEFAULT_WORKSPACE_ID = "workspace-demo";
export const DEFAULT_USER_ID = "user-demo";

export type FacebookMode = "mock" | "real";

export type FacebookRuntimeConfig = {
  mode: FacebookMode;
  graphApiVersion: string;
  appId?: string;
  appSecret?: string;
  verifyToken: string;
  crmAppUrl: string;
  redirectUri: string;
  encryptionKey?: string;
  missing: string[];
};

export type FacebookConnectionRecord = {
  id: string;
  workspaceId: string;
  connectedByUserId?: string | null;
  facebookUserId: string;
  accessTokenEncrypted: string;
  tokenExpiresAt?: string | null;
  scopes: string;
  status: "active" | "disconnected" | "mock" | "error";
  createdAt: string;
  updatedAt: string;
};

export type FacebookPageRecord = {
  id: string;
  workspaceId: string;
  connectionId?: string | null;
  externalPageId: string;
  name: string;
  pageAccessTokenEncrypted?: string | null;
  status: "connected" | "disconnected" | "mock" | "error";
  tokenStatus: "valid" | "missing" | "expired" | "revoked" | "mock";
  subscribedWebhook: boolean;
  pictureUrl?: string | null;
  syncedAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CustomerRecord = {
  id: string;
  workspaceId: string;
  name: string;
  phone?: string | null;
  facebookId?: string | null;
  note?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ConversationRecord = {
  id: string;
  workspaceId: string;
  pageId: string;
  customerId?: string | null;
  externalConversationId?: string | null;
  assignedToUserId?: string | null;
  channel: "messenger" | "comment";
  status: "open" | "pending" | "closed";
  unreadCount: number;
  priority: "low" | "normal" | "high";
  lastMessagePreview?: string | null;
  lastMessageAt: string;
  createdAt: string;
  updatedAt: string;
};

export type MessageRecord = {
  id: string;
  conversationId: string;
  externalMessageId?: string | null;
  pageId?: string | null;
  customerId?: string | null;
  senderType: "customer" | "page" | "system";
  direction: "inbound" | "outbound";
  body: string;
  attachmentJson: string;
  rawPayloadJson: string;
  deliveryStatus: "received" | "sent" | "failed" | "mock";
  createdAt: string;
};

export type CommentRecord = {
  id: string;
  workspaceId: string;
  pageId: string;
  externalCommentId: string;
  externalPostId?: string | null;
  parentCommentId?: string | null;
  customerId?: string | null;
  fromId?: string | null;
  fromName?: string | null;
  body: string;
  permalinkUrl?: string | null;
  rawPayloadJson: string;
  hidden: boolean;
  replied: boolean;
  assignedToUserId?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type FacebookWebhookEventRecord = {
  id: string;
  workspaceId: string;
  pageId?: string | null;
  eventType: string;
  externalEventId: string;
  rawPayloadJson: string;
  signatureValid: boolean;
  processed: boolean;
  error?: string | null;
  receivedAt: string;
  processedAt?: string | null;
};

export type ParsedFacebookMessageEvent = {
  kind: "message" | "postback";
  pageExternalId: string;
  senderId: string;
  recipientId: string;
  externalEventId: string;
  text: string;
  attachments: unknown[];
  raw: Record<string, unknown>;
  createdAt: string;
};

export type ParsedFacebookCommentEvent = {
  kind: "comment";
  pageExternalId: string;
  externalCommentId: string;
  externalPostId?: string;
  parentCommentId?: string;
  fromId?: string;
  fromName?: string;
  message: string;
  permalinkUrl?: string;
  raw: Record<string, unknown>;
  createdAt: string;
};

export type ParsedFacebookWebhookEvent = ParsedFacebookMessageEvent | ParsedFacebookCommentEvent;

export type FacebookPageFromGraph = {
  id: string;
  name: string;
  accessToken: string;
  pictureUrl?: string;
};

export type FacebookSendResult = {
  externalId: string;
  mock: boolean;
};
