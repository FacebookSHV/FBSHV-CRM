CREATE TABLE IF NOT EXISTS `integration_events` (
  `id` text PRIMARY KEY NOT NULL,
  `source_system` text NOT NULL,
  `target_system` text NOT NULL,
  `event_type` text NOT NULL,
  `external_event_id` text NOT NULL,
  `signature_valid` integer DEFAULT 0 NOT NULL,
  `processed_status` text DEFAULT 'received' NOT NULL,
  `payload_json` text DEFAULT '{}' NOT NULL,
  `error_message` text,
  `created_at` text NOT NULL,
  `processed_at` text
);
CREATE UNIQUE INDEX IF NOT EXISTS `integration_events_source_external_idx`
ON `integration_events` (`source_system`, `external_event_id`);
CREATE INDEX IF NOT EXISTS `integration_events_status_idx`
ON `integration_events` (`processed_status`, `created_at`);

CREATE TABLE IF NOT EXISTS `integration_jobs` (
  `id` text PRIMARY KEY NOT NULL,
  `source_event_id` text,
  `job_type` text NOT NULL,
  `source_system` text NOT NULL,
  `target_system` text NOT NULL,
  `idempotency_key` text,
  `status` text DEFAULT 'queued' NOT NULL,
  `locked_until` text,
  `retry_count` integer DEFAULT 0 NOT NULL,
  `max_retry_count` integer DEFAULT 3 NOT NULL,
  `payload_json` text DEFAULT '{}' NOT NULL,
  `result_json` text,
  `error_message` text,
  `created_at` text NOT NULL,
  `updated_at` text NOT NULL,
  FOREIGN KEY (`source_event_id`) REFERENCES `integration_events`(`id`)
);
CREATE INDEX IF NOT EXISTS `integration_jobs_status_type_idx`
ON `integration_jobs` (`status`, `job_type`, `created_at`);
CREATE INDEX IF NOT EXISTS `integration_jobs_source_event_idx`
ON `integration_jobs` (`source_event_id`);
CREATE UNIQUE INDEX IF NOT EXISTS `integration_jobs_idempotency_idx`
ON `integration_jobs` (`job_type`, `idempotency_key`)
WHERE `idempotency_key` IS NOT NULL;

CREATE TABLE IF NOT EXISTS `core_action_audit_logs` (
  `id` text PRIMARY KEY NOT NULL,
  `actor_type` text NOT NULL,
  `actor_id` text,
  `action_type` text NOT NULL,
  `source_module` text NOT NULL,
  `target_system` text NOT NULL,
  `idempotency_key` text,
  `request_json` text,
  `response_json` text,
  `result_status` text NOT NULL,
  `error_message` text,
  `created_at` text NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS `core_action_idempotency_idx`
ON `core_action_audit_logs` (`idempotency_key`)
WHERE `idempotency_key` IS NOT NULL;
