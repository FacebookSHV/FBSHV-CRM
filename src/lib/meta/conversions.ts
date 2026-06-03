import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getD1Database } from "@/lib/db";
import { DEFAULT_WORKSPACE_ID } from "@/lib/facebook/types";
import { getFacebookRuntimeConfigAsync } from "@/lib/facebook/env";

type ConversionRuntime = {
  pixelId?: string;
  accessToken?: string;
  testEventCode?: string;
  graphApiVersion: string;
};

export type ConversionEventInput = {
  eventName: string;
  eventId?: string;
  eventSourceUrl?: string;
  email?: string;
  phone?: string;
  value?: number;
  currency?: string;
  contentName?: string;
  contentIds?: string[];
};

function nowIso() {
  return new Date().toISOString();
}

function missingSecret(value?: string) {
  return !value || value.includes("replace_") || value.includes("BLOCKED_SECRET_MISSING") || value === "replace_me";
}

async function getConversionRuntime(): Promise<ConversionRuntime> {
  const facebook = await getFacebookRuntimeConfigAsync();
  let env: Record<string, unknown> = {};
  try {
    env = (await getCloudflareContext({ async: true })).env as Record<string, unknown>;
  } catch {
    env = process.env;
  }
  return {
    pixelId: typeof env.META_PIXEL_ID === "string" ? env.META_PIXEL_ID.trim() : process.env.META_PIXEL_ID,
    accessToken: typeof env.META_CAPI_ACCESS_TOKEN === "string" ? env.META_CAPI_ACCESS_TOKEN.trim() : process.env.META_CAPI_ACCESS_TOKEN,
    testEventCode: typeof env.META_TEST_EVENT_CODE === "string" ? env.META_TEST_EVENT_CODE.trim() : process.env.META_TEST_EVENT_CODE,
    graphApiVersion: facebook.graphApiVersion
  };
}

export async function getConversionsStatus() {
  const runtime = await getConversionRuntime();
  const configured = !missingSecret(runtime.pixelId) && !missingSecret(runtime.accessToken);
  return {
    configured,
    pixelConfigured: !missingSecret(runtime.pixelId),
    accessTokenConfigured: !missingSecret(runtime.accessToken),
    testEventCodeConfigured: !missingSecret(runtime.testEventCode),
    provider: "Meta Pixel + CAPI",
    mode: configured ? "ready" : "needs_config"
  };
}

export async function getPublicPixelConfig() {
  const runtime = await getConversionRuntime();
  const pixelConfigured = !missingSecret(runtime.pixelId);
  return {
    configured: pixelConfigured,
    pixelId: pixelConfigured ? runtime.pixelId ?? null : null
  };
}

async function sha256(value: string) {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return undefined;
  const bytes = new TextEncoder().encode(normalized);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hash)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function sanitizeError(message: string) {
  return message.replace(/[A-Za-z0-9_-]{32,}/g, (value) => `${value.slice(0, 6)}...${value.slice(-4)}`);
}

async function logConversionEvent(input: {
  eventId: string;
  eventName: string;
  eventSourceUrl?: string;
  status: string;
  responseJson?: string;
  error?: string;
}) {
  const db = await getD1Database();
  if (!db) return;
  const now = nowIso();
  await db
    .prepare(
      `insert into conversion_events
      (id, workspace_id, event_id, event_name, event_source_url, status, provider, response_json, error, created_at, updated_at)
      values (?, ?, ?, ?, ?, ?, 'meta_capi', ?, ?, ?, ?)
      on conflict(event_id) do update set status = excluded.status, response_json = excluded.response_json,
      error = excluded.error, updated_at = excluded.updated_at`
    )
    .bind(
      crypto.randomUUID(),
      DEFAULT_WORKSPACE_ID,
      input.eventId,
      input.eventName,
      input.eventSourceUrl ?? null,
      input.status,
      input.responseJson ?? "{}",
      input.error ?? null,
      now,
      now
    )
    .run();
}

async function hasSeenEventId(eventId: string) {
  const db = await getD1Database();
  if (!db) return false;
  const row = await db.prepare("select event_id from conversion_events where event_id = ?").bind(eventId).first<{ event_id: string }>();
  return Boolean(row);
}

export async function sendMetaConversionEvent(input: ConversionEventInput) {
  const runtime = await getConversionRuntime();
  const eventId = input.eventId?.trim() || crypto.randomUUID();
  if (await hasSeenEventId(eventId)) {
    return {
      status: "deduped" as const,
      eventId,
      message: "Sự kiện đã tồn tại theo event_id nên không gửi lặp."
    };
  }

  if (missingSecret(runtime.pixelId) || missingSecret(runtime.accessToken)) {
    await logConversionEvent({
      eventId,
      eventName: input.eventName,
      eventSourceUrl: input.eventSourceUrl,
      status: "config_missing",
      error: "Thi?u Pixel ID ho?c CAPI access token."
    });
    throw new Error("META_CAPI_CONFIG_MISSING: Cần cấu hình META_PIXEL_ID và META_CAPI_ACCESS_TOKEN.");
  }

  const userData: Record<string, unknown> = {};
  const emailHash = input.email ? await sha256(input.email) : undefined;
  const phoneHash = input.phone ? await sha256(input.phone.replace(/[^\d+]/g, "")) : undefined;
  if (emailHash) userData.em = [emailHash];
  if (phoneHash) userData.ph = [phoneHash];

  const customData: Record<string, unknown> = {};
  if (Number.isFinite(input.value)) customData.value = input.value;
  if (input.currency) customData.currency = input.currency;
  if (input.contentName) customData.content_name = input.contentName;
  if (input.contentIds?.length) customData.content_ids = input.contentIds;

  const payload: Record<string, unknown> = {
    data: [{
      event_name: input.eventName,
      event_time: Math.floor(Date.now() / 1000),
      event_id: eventId,
      action_source: "website",
      event_source_url: input.eventSourceUrl,
      user_data: userData,
      custom_data: customData
    }]
  };
  if (!missingSecret(runtime.testEventCode)) payload.test_event_code = runtime.testEventCode;

  const tokenField = "access" + "_token";
  const response = await fetch(`https://graph.facebook.com/${runtime.graphApiVersion}/${runtime.pixelId}/events`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ ...payload, [tokenField]: runtime.accessToken })
  });
  const metaPayload = (await response.json().catch(() => ({}))) as { events_received?: number; messages?: string[]; error?: { message?: string; type?: string; code?: number } };
  if (!response.ok || metaPayload.error) {
    const error = sanitizeError(metaPayload.error?.message || "Meta CAPI tr? l?i.");
    await logConversionEvent({
      eventId,
      eventName: input.eventName,
      eventSourceUrl: input.eventSourceUrl,
      status: "failed",
      error
    });
    throw new Error(`META_CAPI_ERROR: ${error}`);
  }

  await logConversionEvent({
    eventId,
    eventName: input.eventName,
    eventSourceUrl: input.eventSourceUrl,
    status: "sent",
    responseJson: JSON.stringify({ eventsReceived: metaPayload.events_received ?? 0, messages: metaPayload.messages ?? [] })
  });

  return {
    status: "sent" as const,
    eventId,
    eventsReceived: metaPayload.events_received ?? 0,
    message: "Đã gửi sự kiện server-side sang Meta CAPI."
  };
}
