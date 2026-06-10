import { describe, expect, it, vi } from "vitest";
import { buildRuntimeGuardReport } from "@/lib/core-flow/runtime-guards";
import { ExternalCoreClient, resetExternalCoreCircuit } from "@/lib/core-flow/external-core-client";
import { resetIntegrationEventsForTests, saveIncomingEvent } from "@/lib/integration/events-store";
import {
  atomicClaimIntegrationJobSql,
  cancelIntegrationJob,
  claimNextIntegrationJob,
  enqueueIntegrationJob,
  failIntegrationJob,
  listIntegrationJobs,
  resetIntegrationJobsForTests
} from "@/lib/integration/jobs-store";
import { isSameOriginMutation } from "@/lib/request-security";

describe("core flow runtime guard", () => {
  it("chặn production khi còn mock flag hoặc thiếu secret/binding", () => {
    const report = buildRuntimeGuardReport(
      {
        NODE_ENV: "production",
        MOCK_EXTERNAL_APIS: "true",
        MOCK_ECOMMERCE_API: "true",
        META_APP_ID: "1296077039298909",
        META_APP_SECRET: "secret",
        META_VERIFY_TOKEN: "verify",
        CRM_APP_URL: "https://fbshv-crm.ngchihuy.workers.dev",
        ENCRYPTION_KEY: "enc",
        ECOMMERCE_API_BASE_URL: "https://huyvan-worker-api.nghiemchihuy.workers.dev",
        ECOMMERCE_API_KEY: "key"
      },
      { db: true, r2: false }
    );
    expect(report.ready).toBe(false);
    expect(report.missingSecrets).toContain("ECOMMERCE_WEBHOOK_SECRET");
    expect(report.missingBindings).toContain("BUCKET");
    expect(report.mockFlags).toEqual(["MOCK_EXTERNAL_APIS", "MOCK_ECOMMERCE_API"]);
  });

  it("pass khi production đủ secret, binding và mock flags tắt", () => {
    const report = buildRuntimeGuardReport(
      {
        NODE_ENV: "production",
        MOCK_EXTERNAL_APIS: "false",
        MOCK_ECOMMERCE_API: "false",
        META_APP_ID: "1296077039298909",
        META_APP_SECRET: "secret",
        META_VERIFY_TOKEN: "verify",
        CRM_APP_URL: "https://fbshv-crm.ngchihuy.workers.dev",
        ENCRYPTION_KEY: "enc",
        ECOMMERCE_API_BASE_URL: "https://huyvan-worker-api.nghiemchihuy.workers.dev",
        ECOMMERCE_API_KEY: "key",
        ECOMMERCE_WEBHOOK_SECRET: "webhook"
      },
      { db: true, r2: true }
    );
    expect(report.ready).toBe(true);
  });
});

describe("external core client", () => {
  it("retry một lần với lỗi 5xx rồi trả thành công", async () => {
    resetExternalCoreCircuit();
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ success: false, error: "temporary" }), { status: 502 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ success: true, data: { ok: true } }), { status: 200 }));
    const client = new ExternalCoreClient({
      baseUrl: "https://core.example.com",
      apiKey: "unit-test",
      retryDelayMs: 1,
      fetchImpl
    });
    const result = await client.request<{ ok: boolean }>("/api/external/health");
    expect(result.success).toBe(true);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("mở circuit breaker sau nhiều lần lỗi", async () => {
    resetExternalCoreCircuit();
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ success: false, error: "down" }), { status: 503 })
    );
    const client = new ExternalCoreClient({
      baseUrl: "https://down.example.com",
      apiKey: "unit-test",
      retry: 0,
      failureThreshold: 2,
      cooldownMs: 60000,
      fetchImpl
    });
    await client.request("/api/external/health");
    await client.request("/api/external/health");
    const result = await client.request("/api/external/health");
    expect(result.success).toBe(false);
    if (!result.success) expect(result.code).toBe("CORE_UNAVAILABLE");
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });
});

describe("integration events/jobs backbone", () => {
  it("dedup incoming event theo source_system + external_event_id", async () => {
    resetIntegrationEventsForTests();
    const first = await saveIncomingEvent({
      sourceSystem: "web-tmdt",
      targetSystem: "fbshv-crm",
      eventType: "order.status_changed",
      externalEventId: "evt_core_test_1",
      signatureValid: true,
      payloadJson: { status: "completed" }
    });
    const second = await saveIncomingEvent({
      sourceSystem: "web-tmdt",
      targetSystem: "fbshv-crm",
      eventType: "order.status_changed",
      externalEventId: "evt_core_test_1",
      signatureValid: true,
      payloadJson: { status: "completed" }
    });
    expect(first.duplicate).toBe(false);
    expect(second.duplicate).toBe(true);
    expect(second.event.id).toBe(first.event.id);
  });

  it("enqueue job idempotent và claim một job queued", async () => {
    resetIntegrationJobsForTests();
    const first = await enqueueIntegrationJob({
      jobType: "sync_order_status_to_crm",
      sourceSystem: "web-tmdt",
      targetSystem: "fbshv-crm",
      idempotencyKey: "job_core_test_1",
      payloadJson: { orderId: "order-1" }
    });
    const second = await enqueueIntegrationJob({
      jobType: "sync_order_status_to_crm",
      sourceSystem: "web-tmdt",
      targetSystem: "fbshv-crm",
      idempotencyKey: "job_core_test_1",
      payloadJson: { orderId: "order-1" }
    });
    expect(second.id).toBe(first.id);

    const claimed = await claimNextIntegrationJob();
    expect(claimed?.id).toBe(first.id);
    expect(claimed?.status).toBe("running");
  });

  it("atomic claim SQL dùng UPDATE RETURNING", () => {
    const sql = atomicClaimIntegrationJobSql().toLowerCase();
    expect(sql).toContain("update integration_jobs");
    expect(sql).toContain("returning");
    expect(sql).toContain("retry_count < max_retry_count");
  });

  it("chỉ cho phép mutation từ cùng origin", () => {
    const allowed = new Request("https://crm.example/api/jobs/1/retry", {
      method: "POST",
      headers: { origin: "https://crm.example", "sec-fetch-site": "same-origin" }
    });
    const blocked = new Request("https://crm.example/api/jobs/1/retry", {
      method: "POST",
      headers: { origin: "https://outside.example", "sec-fetch-site": "cross-site" }
    });

    expect(isSameOriginMutation(allowed)).toBe(true);
    expect(isSameOriginMutation(blocked)).toBe(false);
  });

  it("không hủy job đã thất bại", async () => {
    resetIntegrationJobsForTests();
    const job = await enqueueIntegrationJob({
      jobType: "test_transition",
      sourceSystem: "test",
      targetSystem: "fbshv-crm",
      idempotencyKey: "transition-1"
    });
    await claimNextIntegrationJob();
    await failIntegrationJob(job.id, "test_failure", false);

    expect(await cancelIntegrationJob(job.id)).toBeNull();
  });

  it("job hết khóa tăng retry và dừng khi đạt giới hạn", async () => {
    resetIntegrationJobsForTests();
    await enqueueIntegrationJob({
      jobType: "expired_job",
      sourceSystem: "test",
      targetSystem: "fbshv-crm",
      idempotencyKey: "expired-1",
      maxRetryCount: 1
    });

    expect(await claimNextIntegrationJob(-1)).not.toBeNull();
    expect(await claimNextIntegrationJob()).toBeNull();
    const [job] = await listIntegrationJobs();
    expect(job?.status).toBe("failed");
    expect(job?.retryCount).toBe(1);
    expect(job?.errorMessage).toBe("MAX_RETRY_EXCEEDED");
  });
});
