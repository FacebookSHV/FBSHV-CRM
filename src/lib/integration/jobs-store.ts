import { getD1Database } from "@/lib/db";
import type { IntegrationJob, IntegrationJobStatus } from "./types";

type IntegrationJobRow = {
  id: string;
  source_event_id: string | null;
  job_type: string;
  source_system: string;
  target_system: string;
  idempotency_key: string | null;
  status: string;
  locked_until: string | null;
  retry_count: number;
  max_retry_count: number;
  payload_json: string;
  result_json: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
};

type EnqueueIntegrationJobInput = {
  sourceEventId?: string | null;
  jobType: string;
  sourceSystem: string;
  targetSystem: string;
  idempotencyKey?: string | null;
  payloadJson?: Record<string, unknown>;
  maxRetryCount?: number;
};

const memoryJobs = new Map<string, IntegrationJob>();

export function resetIntegrationJobsForTests() {
  memoryJobs.clear();
}

function nowIso() {
  return new Date().toISOString();
}

function safeJson(value: unknown) {
  return JSON.stringify(value ?? {});
}

function parseJson(value: string | null) {
  if (!value) return null;
  try {
    return JSON.parse(value) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function statusOrDefault(value: unknown): IntegrationJobStatus {
  const statuses = new Set<IntegrationJobStatus>(["queued", "running", "needs_user", "completed", "failed", "cancelled"]);
  return statuses.has(value as IntegrationJobStatus) ? (value as IntegrationJobStatus) : "queued";
}

function mapJob(row: IntegrationJobRow): IntegrationJob {
  return {
    id: row.id,
    sourceEventId: row.source_event_id,
    jobType: row.job_type,
    sourceSystem: row.source_system,
    targetSystem: row.target_system,
    idempotencyKey: row.idempotency_key,
    status: statusOrDefault(row.status),
    lockedUntil: row.locked_until,
    retryCount: Number(row.retry_count || 0),
    maxRetryCount: Number(row.max_retry_count || 3),
    payloadJson: parseJson(row.payload_json) ?? {},
    resultJson: parseJson(row.result_json),
    errorMessage: row.error_message,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export function atomicClaimIntegrationJobSql() {
  return `UPDATE integration_jobs
SET
  status = 'running',
  locked_until = ?,
  updated_at = ?
WHERE id = (
  SELECT id
  FROM integration_jobs
  WHERE status = 'queued'
    AND (locked_until IS NULL OR locked_until < ?)
    AND retry_count < max_retry_count
  ORDER BY created_at ASC
  LIMIT 1
)
RETURNING id, source_event_id, job_type, source_system, target_system, idempotency_key, status,
  locked_until, retry_count, max_retry_count, payload_json, result_json, error_message, created_at, updated_at`;
}

export async function enqueueIntegrationJob(input: EnqueueIntegrationJobInput) {
  const db = await getD1Database();
  const createdAt = nowIso();
  const id = crypto.randomUUID();
  const job: IntegrationJob = {
    id,
    sourceEventId: input.sourceEventId ?? null,
    jobType: input.jobType,
    sourceSystem: input.sourceSystem,
    targetSystem: input.targetSystem,
    idempotencyKey: input.idempotencyKey ?? null,
    status: "queued",
    lockedUntil: null,
    retryCount: 0,
    maxRetryCount: Math.max(1, Math.min(10, Math.floor(input.maxRetryCount ?? 3))),
    payloadJson: input.payloadJson ?? {},
    resultJson: null,
    errorMessage: null,
    createdAt,
    updatedAt: createdAt
  };

  if (!db) {
    const duplicate = [...memoryJobs.values()].find((item) => item.jobType === job.jobType && item.idempotencyKey && item.idempotencyKey === job.idempotencyKey);
    if (duplicate) return duplicate;
    memoryJobs.set(id, job);
    return job;
  }

  await db
    .prepare(
      `INSERT OR IGNORE INTO integration_jobs
      (id, source_event_id, job_type, source_system, target_system, idempotency_key, status,
       locked_until, retry_count, max_retry_count, payload_json, result_json, error_message, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, 'queued', NULL, 0, ?, ?, NULL, NULL, ?, ?)`
    )
    .bind(
      id,
      job.sourceEventId,
      job.jobType,
      job.sourceSystem,
      job.targetSystem,
      job.idempotencyKey,
      job.maxRetryCount,
      safeJson(job.payloadJson),
      job.createdAt,
      job.updatedAt
    )
    .run();

  if (job.idempotencyKey) {
    const existing = await db
      .prepare(
        `SELECT id, source_event_id, job_type, source_system, target_system, idempotency_key, status,
         locked_until, retry_count, max_retry_count, payload_json, result_json, error_message, created_at, updated_at
         FROM integration_jobs WHERE job_type = ? AND idempotency_key = ? LIMIT 1`
      )
      .bind(job.jobType, job.idempotencyKey)
      .first<IntegrationJobRow>();
    if (existing) return mapJob(existing);
  }

  return job;
}

export async function listIntegrationJobs(limit = 50) {
  const safeLimit = Math.max(1, Math.min(200, Math.floor(limit)));
  const db = await getD1Database();
  if (!db) {
    return [...memoryJobs.values()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, safeLimit);
  }
  const rows = await db
    .prepare(
      `SELECT id, source_event_id, job_type, source_system, target_system, idempotency_key, status,
       locked_until, retry_count, max_retry_count, payload_json, result_json, error_message, created_at, updated_at
       FROM integration_jobs ORDER BY updated_at DESC LIMIT ?`
    )
    .bind(safeLimit)
    .all<IntegrationJobRow>();
  return (rows.results ?? []).map(mapJob);
}

export async function retryIntegrationJob(id: string) {
  const db = await getD1Database();
  const updatedAt = nowIso();
  if (!db) {
    const existing = memoryJobs.get(id);
    if (!existing || !["failed", "needs_user"].includes(existing.status) || existing.retryCount >= existing.maxRetryCount) return null;
    const next = { ...existing, status: "queued" as const, lockedUntil: null, errorMessage: null, updatedAt };
    memoryJobs.set(id, next);
    return next;
  }
  const row = await db
    .prepare(
      `UPDATE integration_jobs
       SET status = 'queued', locked_until = NULL, error_message = NULL, updated_at = ?
       WHERE id = ? AND status IN ('failed', 'needs_user') AND retry_count < max_retry_count`
    )
    .bind(updatedAt, id)
    .run();
  if (!row.meta.changes) return null;
  const updated = await db
    .prepare(
      `SELECT id, source_event_id, job_type, source_system, target_system, idempotency_key, status,
       locked_until, retry_count, max_retry_count, payload_json, result_json, error_message, created_at, updated_at
       FROM integration_jobs
       WHERE id = ? AND status = 'queued' AND retry_count < max_retry_count
       LIMIT 1`
    )
    .bind(id)
    .first<IntegrationJobRow>();
  return updated ? mapJob(updated) : null;
}

export async function cancelIntegrationJob(id: string) {
  const db = await getD1Database();
  const updatedAt = nowIso();
  if (!db) {
    const existing = memoryJobs.get(id);
    if (!existing || !["queued", "running", "needs_user"].includes(existing.status)) return null;
    const next = { ...existing, status: "cancelled" as const, lockedUntil: null, updatedAt };
    memoryJobs.set(id, next);
    return next;
  }
  const result = await db
    .prepare(
      "UPDATE integration_jobs SET status = 'cancelled', locked_until = NULL, updated_at = ? WHERE id = ? AND status IN ('queued', 'running', 'needs_user')"
    )
    .bind(updatedAt, id)
    .run();
  if (!result.meta.changes) return null;
  const updated = await db
    .prepare(
      `SELECT id, source_event_id, job_type, source_system, target_system, idempotency_key, status,
       locked_until, retry_count, max_retry_count, payload_json, result_json, error_message, created_at, updated_at
       FROM integration_jobs WHERE id = ? LIMIT 1`
    )
    .bind(id)
    .first<IntegrationJobRow>();
  return updated ? mapJob(updated) : null;
}

export async function claimNextIntegrationJob(lockMs = 120000) {
  const db = await getD1Database();
  const now = nowIso();
  const lockedUntil = new Date(Date.now() + lockMs).toISOString();

  if (!db) {
    for (const item of memoryJobs.values()) {
      if (item.status !== "running" || !item.lockedUntil || item.lockedUntil >= now) continue;
      const retryCount = item.retryCount + 1;
      memoryJobs.set(item.id, {
        ...item,
        status: retryCount >= item.maxRetryCount ? "failed" : "queued",
        retryCount,
        lockedUntil: null,
        errorMessage: retryCount >= item.maxRetryCount ? "MAX_RETRY_EXCEEDED" : item.errorMessage,
        updatedAt: now
      });
    }
    const job = [...memoryJobs.values()]
      .filter((item) => item.status === "queued" && item.retryCount < item.maxRetryCount)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))[0];
    if (!job) return null;
    const claimed = { ...job, status: "running" as const, lockedUntil, updatedAt: now };
    memoryJobs.set(job.id, claimed);
    return claimed;
  }

  // NEO: Job hết khóa phải tự quay lại hàng chờ để cron sau có thể xử lý tiếp.
  await db
    .prepare(
      `UPDATE integration_jobs
       SET status = CASE WHEN retry_count + 1 >= max_retry_count THEN 'failed' ELSE 'queued' END,
           retry_count = retry_count + 1,
           locked_until = NULL,
           error_message = CASE WHEN retry_count + 1 >= max_retry_count THEN 'MAX_RETRY_EXCEEDED' ELSE error_message END,
           updated_at = ?
       WHERE status = 'running' AND locked_until IS NOT NULL AND locked_until < ?`
    )
    .bind(now, now)
    .run();

  // NEO: D1 claim job phải atomic bằng UPDATE ... RETURNING để tránh 2 Worker cùng xử lý một job.
  const row = await db.prepare(atomicClaimIntegrationJobSql()).bind(lockedUntil, now, now).first<IntegrationJobRow>();
  return row ? mapJob(row) : null;
}

export async function completeIntegrationJob(id: string, resultJson: Record<string, unknown> = {}) {
  const db = await getD1Database();
  const updatedAt = nowIso();
  if (!db) {
    const existing = memoryJobs.get(id);
    if (!existing) return null;
    const next = { ...existing, status: "completed" as const, resultJson, errorMessage: null, updatedAt };
    memoryJobs.set(id, next);
    return next;
  }
  await db
    .prepare("UPDATE integration_jobs SET status = 'completed', locked_until = NULL, result_json = ?, error_message = NULL, updated_at = ? WHERE id = ?")
    .bind(safeJson(resultJson), updatedAt, id)
    .run();
  return null;
}

export async function failIntegrationJob(id: string, errorMessage: string, retryable = true) {
  const db = await getD1Database();
  const updatedAt = nowIso();
  if (!db) {
    const existing = memoryJobs.get(id);
    if (!existing) return null;
    const retryCount = existing.retryCount + 1;
    const nextStatus: IntegrationJobStatus = retryable && retryCount < existing.maxRetryCount ? "queued" : "failed";
    const next = { ...existing, status: nextStatus, retryCount, lockedUntil: null, errorMessage, updatedAt };
    memoryJobs.set(id, next);
    return next;
  }
  await db
    .prepare(
      `UPDATE integration_jobs
       SET status = CASE WHEN ? = 1 AND retry_count + 1 < max_retry_count THEN 'queued' ELSE 'failed' END,
           retry_count = retry_count + 1,
           locked_until = NULL,
           error_message = ?,
           updated_at = ?
       WHERE id = ?`
    )
    .bind(retryable ? 1 : 0, errorMessage, updatedAt, id)
    .run();
  return null;
}
