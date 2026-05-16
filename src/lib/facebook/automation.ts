import { getD1Database } from "@/lib/db";
import { replyFacebookComment, sendMessengerReply, setFacebookCommentHidden } from "./operations";
import type { ParsedFacebookWebhookEvent } from "./types";
import { DEFAULT_WORKSPACE_ID } from "./types";

type AutomationStatus = "started" | "sent" | "hidden" | "skipped" | "blocked" | "failed";

export type FacebookAutomationConfig = {
  messageReplyEnabled: boolean;
  commentReplyEnabled: boolean;
  phoneHideEnabled: boolean;
  messageTemplate: string;
  commentTemplate: string;
};

type AutomationStart = {
  inserted: boolean;
  id: string;
};

const memoryActions = new Map<string, { status: AutomationStatus; error?: string }>();

function nowIso() {
  return new Date().toISOString();
}

function idFrom(prefix: string, value: string) {
  return `${prefix}_${value.replace(/[^A-Za-z0-9_-]/g, "_")}`;
}

function toBoolean(value: string | undefined) {
  return value === "true";
}

export function getFacebookAutomationConfig(
  env: Record<string, string | undefined> = process.env
): FacebookAutomationConfig {
  return {
    messageReplyEnabled: toBoolean(env.AUTO_REPLY_MESSAGES_ENABLED),
    commentReplyEnabled: toBoolean(env.AUTO_REPLY_COMMENTS_ENABLED),
    phoneHideEnabled: toBoolean(env.AUTO_HIDE_PHONE_COMMENTS_ENABLED),
    messageTemplate:
      env.AUTO_REPLY_MESSAGE_TEMPLATE ||
      "Dạ shop đã nhận được tin nhắn, nhân viên sẽ hỗ trợ mình ngay.",
    commentTemplate:
      env.AUTO_REPLY_COMMENT_TEMPLATE ||
      "Dạ shop đã nhận bình luận, mình nhắn tin cho shop để được hỗ trợ nhanh nhé."
  };
}

export function detectVietnamesePhone(text: string) {
  const matches = text.match(/(?:\+?84|0)(?:[\s.-]*\d){8,10}/g) ?? [];
  return matches.some((match) => {
    const normalized = match.replace(/[^\d+]/g, "");
    const local = normalized.startsWith("+84")
      ? `0${normalized.slice(3)}`
      : normalized.startsWith("84")
        ? `0${normalized.slice(2)}`
        : normalized;
    return /^(03|05|07|08|09)\d{8}$/.test(local);
  });
}

async function startAction(
  event: ParsedFacebookWebhookEvent,
  actionType: string,
  targetId: string
): Promise<AutomationStart> {
  const dedupeKey = `${event.kind}:${event.kind === "comment" ? event.externalCommentId : event.externalEventId}:${actionType}:${targetId}`;
  const id = crypto.randomUUID();
  const createdAt = nowIso();
  const db = await getD1Database();

  if (!db) {
    if (memoryActions.has(dedupeKey)) return { inserted: false, id: dedupeKey };
    memoryActions.set(dedupeKey, { status: "started" });
    return { inserted: true, id: dedupeKey };
  }

  const result = await db
    .prepare(
      `insert or ignore into facebook_automation_actions
      (id, workspace_id, page_id, event_id, action_type, target_id, dedupe_key, status, metadata_json, created_at, updated_at)
      values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      id,
      DEFAULT_WORKSPACE_ID,
      event.pageExternalId,
      event.kind === "comment" ? event.externalCommentId : event.externalEventId,
      actionType,
      targetId,
      dedupeKey,
      "started",
      JSON.stringify({ eventKind: event.kind }),
      createdAt,
      createdAt
    )
    .run();
  return { inserted: (result.meta.changes ?? 0) > 0, id };
}

async function finishAction(id: string, status: AutomationStatus, error?: string) {
  const db = await getD1Database();
  if (!db) {
    const current = memoryActions.get(id) ?? { status: "started" as AutomationStatus };
    memoryActions.set(id, { ...current, status, error });
    return;
  }

  await db
    .prepare("update facebook_automation_actions set status = ?, error = ?, updated_at = ? where id = ?")
    .bind(status, error ?? null, nowIso(), id)
    .run();
}

async function runAction(
  event: ParsedFacebookWebhookEvent,
  actionType: string,
  targetId: string,
  status: AutomationStatus,
  action: () => Promise<unknown>
) {
  const started = await startAction(event, actionType, targetId);
  if (!started.inserted) return { actionType, status: "skipped" as const };

  try {
    await action();
    await finishAction(started.id, status);
    return { actionType, status };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Automation lỗi không xác định.";
    const blocked = message.startsWith("BLOCKED_META_PERMISSION_MISSING");
    await finishAction(started.id, blocked ? "blocked" : "failed", message);
    return { actionType, status: blocked ? "blocked" : "failed", error: message };
  }
}

export async function runFacebookAutomation(event: ParsedFacebookWebhookEvent) {
  const config = getFacebookAutomationConfig();
  const results: Array<{ actionType: string; status: string; error?: string }> = [];

  if (event.kind === "message" || event.kind === "postback") {
    if (!config.messageReplyEnabled || event.senderId === event.pageExternalId) return results;
    const conversationId = idFrom("conv", `${event.pageExternalId}_${event.senderId}`);
    results.push(
      await runAction(event, "auto_reply_message", conversationId, "sent", () =>
        sendMessengerReply(conversationId, config.messageTemplate)
      )
    );
    return results;
  }

  if (event.kind !== "comment") return results;
  if (event.fromId === event.pageExternalId) return results;
  const commentId = idFrom("comment", event.externalCommentId);

  if (config.phoneHideEnabled && detectVietnamesePhone(event.message)) {
    // NEO: Tự ẩn số điện thoại để giảm rủi ro lộ thông tin khách trên bình luận công khai.
    results.push(
      await runAction(event, "auto_hide_phone_comment", commentId, "hidden", () =>
        setFacebookCommentHidden(commentId, true)
      )
    );
  }

  if (config.commentReplyEnabled) {
    results.push(
      await runAction(event, "auto_reply_comment", commentId, "sent", () =>
        replyFacebookComment(commentId, config.commentTemplate)
      )
    );
  }

  return results;
}

export function resetFacebookAutomationMemoryForTests() {
  memoryActions.clear();
}
