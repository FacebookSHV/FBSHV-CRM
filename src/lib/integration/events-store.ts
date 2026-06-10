import { getD1Database } from "@/lib/db";
import type { CoreActionAuditLogInput, IntegrationEvent, IntegrationEventStatus } from "./types";

type IntegrationEventRow = {
  id: string;
  source_system: string;
  target_system: string;
  event_type: string;
  external_event_id: string;
  signature_valid: number;
  processed_status: string;
  payload_json: string;
  error_message: string | null;
  created_at: string;
  processed_at: string | null;
};

type SaveIncomingEventInput = {
  sourceSystem: string;
  targetSystem: string;
  eventType: string;
  externalEventId: string;
  signatureValid: boolean;
  processedStatus?: IntegrationEventStatus;
  payloadJson: Record<string, unknown>;
  errorMessage?: string | null;
};

const memoryEvents = new Map<string, IntegrationEvent>();

export function resetIntegrationEventsForTests() {
  memoryEvents.clear();
}

function nowIso() {
  return new Date().toISOString();
}

function safeJson(value: unknown) {
  return JSON.stringify(value ?? {});
}

function parseJson(value: string) {
  try {
    return JSON.parse(value) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function statusOrDefault(value: unknown): IntegrationEventStatus {
  const statuses = new Set<IntegrationEventStatus>(["received", "verified", "queued", "processed", "skipped_duplicate", "failed", "rejected"]);
  return statuses.has(value as IntegrationEventStatus) ? (value as IntegrationEventStatus) : "received";
}

function mapEvent(row: IntegrationEventRow): IntegrationEvent {
  return {
    id: row.id,
    sourceSystem: row.source_system,
    targetSystem: row.target_system,
    eventType: row.event_type,
    externalEventId: row.external_event_id,
    signatureValid: Boolean(row.signature_valid),
    processedStatus: statusOrDefault(row.processed_status),
    payloadJson: parseJson(row.payload_json),
    errorMessage: row.error_message,
    createdAt: row.created_at,
    processedAt: row.processed_at
  };
}

export async function saveIncomingEvent(input: SaveIncomingEventInput) {
  const db = await getD1Database();
  const createdAt = nowIso();
  const id = crypto.randomUUID();
  const event: IntegrationEvent = {
    id,
    sourceSystem: input.sourceSystem,
    targetSystem: input.targetSystem,
    eventType: input.eventType,
    externalEventId: input.externalEventId,
    signatureValid: input.signatureValid,
    processedStatus: input.processedStatus ?? (input.signatureValid ? "verified" : "rejected"),
    payloadJson: input.payloadJson,
    errorMessage: input.errorMessage ?? null,
    createdAt,
    processedAt: null
  };

  if (!db) {
    const duplicate = [...memoryEvents.values()].find((item) => item.sourceSystem === event.sourceSystem && item.externalEventId === event.externalEventId);
    if (duplicate) return { event: duplicate, duplicate: true };
    memoryEvents.set(id, event);
    return { event, duplicate: false };
  }

  await db
    .prepare(
      `INSERT OR IGNORE INTO integration_events
      (id, source_system, target_system, event_type, external_event_id, signature_valid, processed_status,
       payload_json, error_message, created_at, processed_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)`
    )
    .bind(
      id,
      event.sourceSystem,
      event.targetSystem,
      event.eventType,
      event.externalEventId,
      event.signatureValid ? 1 : 0,
      event.processedStatus,
      safeJson(event.payloadJson),
      event.errorMessage,
      event.createdAt
    )
    .run();

  const row = await db
    .prepare(
      `SELECT id, source_system, target_system, event_type, external_event_id, signature_valid,
       processed_status, payload_json, error_message, created_at, processed_at
       FROM integration_events WHERE source_system = ? AND external_event_id = ? LIMIT 1`
    )
    .bind(event.sourceSystem, event.externalEventId)
    .first<IntegrationEventRow>();
  return { event: row ? mapEvent(row) : event, duplicate: Boolean(row && row.id !== id) };
}

export async function getIntegrationEvent(id: string) {
  const db = await getD1Database();
  if (!db) return memoryEvents.get(id) ?? null;
  const row = await db
    .prepare(
      `SELECT id, source_system, target_system, event_type, external_event_id, signature_valid,
       processed_status, payload_json, error_message, created_at, processed_at
       FROM integration_events WHERE id = ? LIMIT 1`
    )
    .bind(id)
    .first<IntegrationEventRow>();
  return row ? mapEvent(row) : null;
}

export async function updateIntegrationEventStatus(id: string, status: IntegrationEventStatus, errorMessage?: string | null) {
  const db = await getD1Database();
  const processedAt = status === "processed" || status === "failed" || status === "rejected" ? nowIso() : null;
  if (!db) {
    const existing = memoryEvents.get(id);
    if (!existing) return null;
    const next = { ...existing, processedStatus: status, errorMessage: errorMessage ?? existing.errorMessage, processedAt };
    memoryEvents.set(id, next);
    return next;
  }
  await db
    .prepare("UPDATE integration_events SET processed_status = ?, error_message = ?, processed_at = ? WHERE id = ?")
    .bind(status, errorMessage ?? null, processedAt, id)
    .run();
  return null;
}

export async function writeCoreActionAuditLog(input: CoreActionAuditLogInput) {
  const db = await getD1Database();
  if (!db) return null;
  await db
    .prepare(
      `INSERT OR IGNORE INTO core_action_audit_logs
      (id, actor_type, actor_id, action_type, source_module, target_system, idempotency_key,
       request_json, response_json, result_status, error_message, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      crypto.randomUUID(),
      input.actorType,
      input.actorId ?? null,
      input.actionType,
      input.sourceModule,
      input.targetSystem,
      input.idempotencyKey ?? null,
      input.requestJson ? safeJson(input.requestJson) : null,
      input.responseJson ? safeJson(input.responseJson) : null,
      input.resultStatus,
      input.errorMessage ?? null,
      nowIso()
    )
    .run();
  return true;
}
