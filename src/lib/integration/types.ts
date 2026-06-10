export type IntegrationEventStatus = "received" | "verified" | "queued" | "processed" | "skipped_duplicate" | "failed" | "rejected";

export type IntegrationJobStatus = "queued" | "running" | "needs_user" | "completed" | "failed" | "cancelled";

export type IntegrationEvent = {
  id: string;
  sourceSystem: string;
  targetSystem: string;
  eventType: string;
  externalEventId: string;
  signatureValid: boolean;
  processedStatus: IntegrationEventStatus;
  payloadJson: Record<string, unknown>;
  errorMessage: string | null;
  createdAt: string;
  processedAt: string | null;
};

export type IntegrationJob = {
  id: string;
  sourceEventId: string | null;
  jobType: string;
  sourceSystem: string;
  targetSystem: string;
  idempotencyKey: string | null;
  status: IntegrationJobStatus;
  lockedUntil: string | null;
  retryCount: number;
  maxRetryCount: number;
  payloadJson: Record<string, unknown>;
  resultJson: Record<string, unknown> | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CoreActionAuditLogInput = {
  actorType: string;
  actorId?: string | null;
  actionType: string;
  sourceModule: string;
  targetSystem: string;
  idempotencyKey?: string | null;
  requestJson?: Record<string, unknown> | null;
  responseJson?: Record<string, unknown> | null;
  resultStatus: string;
  errorMessage?: string | null;
};
