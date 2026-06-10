import { fail, ok } from "@/lib/api-response";
import { getEcommerceRuntimeEnv } from "@/lib/ecommerce/provider";
import { webhookEventSchema } from "@/lib/ecommerce/validation";
import { saveIncomingEvent, updateIntegrationEventStatus } from "@/lib/integration/events-store";
import { enqueueIntegrationJob } from "@/lib/integration/jobs-store";
import { verifyEcommerceWebhookSignature } from "@/lib/webhooks/ecommerce";

function jobTypeForEvent(eventType: string) {
  if (eventType.startsWith("order.")) return "sync_order_status_to_crm";
  if (eventType.startsWith("product.") || eventType.startsWith("inventory.")) return "sync_product_to_crm";
  return null;
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const runtimeEnv = await getEcommerceRuntimeEnv();
  const secret = runtimeEnv.ECOMMERCE_WEBHOOK_SECRET;
  const valid = await verifyEcommerceWebhookSignature(
    secret ?? "",
    rawBody,
    request.headers.get("x-webhook-signature")
  );

  if (!valid) {
    await saveIncomingEvent({
      sourceSystem: "web-tmdt",
      targetSystem: "fbshv-crm",
      eventType: request.headers.get("x-webhook-event") || "unknown",
      externalEventId: request.headers.get("x-webhook-id") || crypto.randomUUID(),
      signatureValid: false,
      processedStatus: "rejected",
      payloadJson: { rawBody },
      errorMessage: "INVALID_SIGNATURE"
    });
    return fail("Webhook signature không hợp lệ", 401, "INVALID_SIGNATURE");
  }

  const parsedJson = await Promise.resolve()
    .then(() => JSON.parse(rawBody) as unknown)
    .catch(() => null);
  const parsed = webhookEventSchema.safeParse(parsedJson);
  if (!parsed.success) return fail("Webhook payload không hợp lệ");

  const saved = await saveIncomingEvent({
    sourceSystem: "web-tmdt",
    targetSystem: "fbshv-crm",
    eventType: parsed.data.type,
    externalEventId: parsed.data.eventId,
    signatureValid: true,
    processedStatus: "verified",
    payloadJson: { event: parsed.data, rawBody }
  });
  const jobType = jobTypeForEvent(parsed.data.type);
  if (!jobType) {
    await updateIntegrationEventStatus(saved.event.id, "processed");
    return ok({ accepted: true, duplicate: saved.duplicate, queued: false });
  }

  await enqueueIntegrationJob({
    sourceEventId: saved.event.id,
    jobType,
    sourceSystem: "web-tmdt",
    targetSystem: "fbshv-crm",
    idempotencyKey: parsed.data.eventId,
    payloadJson: { eventId: saved.event.id }
  });
  await updateIntegrationEventStatus(saved.event.id, "queued");
  return ok({ accepted: true, duplicate: saved.duplicate, queued: true });
}
