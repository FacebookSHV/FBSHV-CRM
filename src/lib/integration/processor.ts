import { runFacebookAutomation } from "@/lib/facebook/automation";
import { cacheProductsToD1, syncProductsFromExternal } from "@/lib/ecommerce/cache";
import { getEcommerceProviderAsync } from "@/lib/ecommerce/provider";
import { persistParsedFacebookEvent } from "@/lib/facebook/operations";
import { parseFacebookWebhookPayload } from "@/lib/facebook/webhook";
import { updateFacebookOrderStatus } from "@/lib/orders/store";
import { getIntegrationEvent, updateIntegrationEventStatus } from "./events-store";
import { claimNextIntegrationJob, completeIntegrationJob, failIntegrationJob } from "./jobs-store";
import type { IntegrationJob } from "./types";

type ProcessIntegrationJobsOptions = {
  maxJobs?: number;
  maxRuntimeMs?: number;
};

function readString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function readRecord(value: unknown) {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
}

async function processFacebookWebhookEvent(job: IntegrationJob) {
  const eventId = readString(job.payloadJson.eventId);
  const event = eventId ? await getIntegrationEvent(eventId) : null;
  if (!event) throw new Error("INTEGRATION_EVENT_NOT_FOUND");
  const rawBody = readString(event.payloadJson.rawBody);
  const signatureValid = Boolean(event.payloadJson.signatureValid);
  const parsed = parseFacebookWebhookPayload(JSON.parse(rawBody || "{}"));
  let processed = 0;
  let duplicates = 0;
  const automation: Array<{ actionType: string; status: string; error?: string }> = [];

  for (const item of parsed) {
    const result = await persistParsedFacebookEvent(item, signatureValid);
    if (result.duplicate) {
      duplicates += 1;
      continue;
    }
    processed += 1;
    automation.push(...(await runFacebookAutomation(item)));
  }

  await updateIntegrationEventStatus(event.id, "processed");
  return {
    received: parsed.length,
    processed,
    duplicates,
    automation
  };
}

async function processOrderStatusEvent(job: IntegrationJob) {
  const eventId = readString(job.payloadJson.eventId);
  const event = eventId ? await getIntegrationEvent(eventId) : null;
  if (!event) throw new Error("INTEGRATION_EVENT_NOT_FOUND");
  const webhook = readRecord(event.payloadJson.event);
  const data = readRecord(webhook.data);
  const externalOrderId =
    readString(data.externalOrderId) || readString(data.orderId) || readString(data.id);
  const status = readString(data.status) || readString(webhook.type).replace("order.", "");
  if (!externalOrderId || !status) throw new Error("ORDER_STATUS_EVENT_INVALID");

  const result = await updateFacebookOrderStatus(externalOrderId, status);
  await updateIntegrationEventStatus(event.id, "processed");
  return { externalOrderId, status, updated: result.updated };
}

async function processProductSyncEvent(job: IntegrationJob) {
  const eventId = readString(job.payloadJson.eventId);
  const event = eventId ? await getIntegrationEvent(eventId) : null;
  if (!event) throw new Error("INTEGRATION_EVENT_NOT_FOUND");
  const webhook = readRecord(event.payloadJson.event);
  const data = readRecord(webhook.data);
  const sku = readString(data.sku);

  if (sku) {
    const product = await (await getEcommerceProviderAsync()).getProductBySku(sku);
    if (!product.success) throw new Error(product.code || product.error);
    await cacheProductsToD1([product.data]);
  } else {
    const synced = await syncProductsFromExternal(200);
    if (!synced.success) throw new Error(synced.code || synced.error);
  }

  await updateIntegrationEventStatus(event.id, "processed");
  return { sku: sku || null, refreshed: true };
}

async function processOne(job: IntegrationJob) {
  if (job.jobType === "process_facebook_webhook_event") return processFacebookWebhookEvent(job);
  if (job.jobType === "sync_order_status_to_crm") return processOrderStatusEvent(job);
  if (job.jobType === "sync_product_to_crm") return processProductSyncEvent(job);
  throw new Error(`INTEGRATION_JOB_HANDLER_MISSING: ${job.jobType}`);
}

export async function processIntegrationJobs(options: ProcessIntegrationJobsOptions = {}) {
  const started = Date.now();
  const maxJobs = Math.max(1, Math.min(50, Math.floor(options.maxJobs ?? 10)));
  const maxRuntimeMs = Math.max(1000, Math.min(25000, Math.floor(options.maxRuntimeMs ?? 25000)));
  const results: Array<{ jobId: string; jobType: string; status: "completed" | "failed"; error?: string }> = [];

  for (let index = 0; index < maxJobs; index += 1) {
    if (Date.now() - started > maxRuntimeMs) break;
    const job = await claimNextIntegrationJob();
    if (!job) break;
    try {
      const result = await processOne(job);
      await completeIntegrationJob(job.id, result);
      results.push({ jobId: job.id, jobType: job.jobType, status: "completed" });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await failIntegrationJob(job.id, message, !message.startsWith("INTEGRATION_JOB_HANDLER_MISSING"));
      if (job.sourceEventId) await updateIntegrationEventStatus(job.sourceEventId, "failed", message);
      results.push({ jobId: job.id, jobType: job.jobType, status: "failed", error: message });
    }
  }

  return { processed: results.length, results };
}
