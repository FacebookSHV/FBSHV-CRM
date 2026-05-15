import type {
  ParsedFacebookCommentEvent,
  ParsedFacebookMessageEvent,
  ParsedFacebookWebhookEvent
} from "./types";

const encoder = new TextEncoder();

function toHex(buffer: ArrayBuffer) {
  return [...new Uint8Array(buffer)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function readObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function readString(value: unknown) {
  return typeof value === "string" ? value : undefined;
}

function constantTimeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let index = 0; index < a.length; index += 1) diff |= a.charCodeAt(index) ^ b.charCodeAt(index);
  return diff === 0;
}

async function hmacSha256(secret: string, rawBody: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  return toHex(await crypto.subtle.sign("HMAC", key, encoder.encode(rawBody)));
}

export async function signFacebookWebhookBody(secret: string, rawBody: string) {
  return `sha256=${await hmacSha256(secret, rawBody)}`;
}

export async function verifyFacebookWebhookSignature(
  appSecret: string | undefined,
  rawBody: string,
  headerValue: string | null
) {
  if (!appSecret || !headerValue?.startsWith("sha256=")) return false;
  const expected = await signFacebookWebhookBody(appSecret, rawBody);
  // NEO: Xác thực chữ ký webhook Facebook bằng app secret, không log secret.
  return constantTimeEqual(expected, headerValue);
}

export function verifyFacebookWebhookChallenge(url: URL, verifyToken: string) {
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === verifyToken && challenge) {
    return { ok: true as const, challenge };
  }

  return { ok: false as const };
}

function parseMessagingEvent(entry: Record<string, unknown>, event: Record<string, unknown>) {
  const sender = readObject(event.sender);
  const recipient = readObject(event.recipient);
  const message = readObject(event.message);
  const postback = readObject(event.postback);
  const timestamp = typeof event.timestamp === "number" ? event.timestamp : Date.now();
  const pageExternalId = readString(entry.id) || readString(recipient.id) || "unknown-page";
  const senderId = readString(sender.id) || "unknown-sender";
  const recipientId = readString(recipient.id) || pageExternalId;
  const mid = readString(message.mid) || readString(postback.mid);
  const text = readString(message.text) || readString(postback.title) || readString(postback.payload) || "";
  const attachments = Array.isArray(message.attachments) ? message.attachments : [];

  if (!mid && !text) return null;

  return {
    kind: Object.keys(postback).length > 0 ? "postback" : "message",
    pageExternalId,
    senderId,
    recipientId,
    externalEventId: mid || `msg_${pageExternalId}_${senderId}_${timestamp}`,
    text,
    attachments,
    raw: event,
    createdAt: new Date(timestamp).toISOString()
  } satisfies ParsedFacebookMessageEvent;
}

function parseCommentChange(entry: Record<string, unknown>, change: Record<string, unknown>) {
  const value = readObject(change.value);
  const item = readString(value.item);
  const commentId = readString(value.comment_id) || readString(value.commentId);
  if (item && item !== "comment") return null;
  if (!commentId) return null;

  const from = readObject(value.from);
  return {
    kind: "comment",
    pageExternalId: readString(entry.id) || readString(value.page_id) || "unknown-page",
    externalCommentId: commentId,
    externalPostId: readString(value.post_id),
    parentCommentId: readString(value.parent_id),
    fromId: readString(from.id),
    fromName: readString(from.name),
    message: readString(value.message) || "",
    permalinkUrl: readString(value.permalink_url),
    raw: change,
    createdAt: new Date().toISOString()
  } satisfies ParsedFacebookCommentEvent;
}

export function parseFacebookWebhookPayload(payload: unknown): ParsedFacebookWebhookEvent[] {
  const root = readObject(payload);
  const entries = Array.isArray(root.entry) ? root.entry : [];
  const parsed: ParsedFacebookWebhookEvent[] = [];

  for (const entryValue of entries) {
    const entry = readObject(entryValue);
    const messaging = Array.isArray(entry.messaging) ? entry.messaging : [];
    const changes = Array.isArray(entry.changes) ? entry.changes : [];

    for (const item of messaging) {
      const event = parseMessagingEvent(entry, readObject(item));
      if (event) parsed.push(event);
    }

    for (const item of changes) {
      const change = readObject(item);
      if (readString(change.field) !== "feed" && readString(change.field) !== "comments") continue;
      const event = parseCommentChange(entry, change);
      if (event) parsed.push(event);
    }
  }

  return parsed;
}
