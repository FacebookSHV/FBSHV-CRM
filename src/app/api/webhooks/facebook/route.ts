import { fail, failFromError, ok } from "@/lib/api-response";
import { runFacebookAutomation } from "@/lib/facebook/automation";
import { getFacebookRuntimeConfigAsync } from "@/lib/facebook/env";
import { persistParsedFacebookEvent } from "@/lib/facebook/operations";
import { saveIncomingEvent } from "@/lib/integration/events-store";
import { enqueueIntegrationJob } from "@/lib/integration/jobs-store";
import {
  parseFacebookWebhookPayload,
  verifyFacebookWebhookChallenge,
  verifyFacebookWebhookSignature
} from "@/lib/facebook/webhook";

export async function GET(request: Request) {
  const config = await getFacebookRuntimeConfigAsync();
  const verified = verifyFacebookWebhookChallenge(new URL(request.url), config.verifyToken);
  if (!verified.ok) return new Response("Forbidden", { status: 403 });
  return new Response(verified.challenge, { status: 200 });
}

export async function POST(request: Request) {
  const config = await getFacebookRuntimeConfigAsync();
  const rawBody = await request.text();
  const signature = request.headers.get("x-hub-signature-256");

  if (config.mode === "real" && !config.appSecret) {
    return fail("BLOCKED_BY_MISSING_SECRET: META_APP_SECRET", 400, "BLOCKED_BY_MISSING_SECRET");
  }

  const signatureValid = await verifyFacebookWebhookSignature(config.appSecret, rawBody, signature);
  if (config.mode === "real" && !signatureValid) {
    await saveIncomingEvent({
      sourceSystem: "facebook",
      targetSystem: "fbshv-crm",
      eventType: "facebook.webhook",
      externalEventId: `rejected_${crypto.randomUUID()}`,
      signatureValid: false,
      processedStatus: "rejected",
      payloadJson: { rawBody, signatureValid: false },
      errorMessage: "FACEBOOK_SIGNATURE_INVALID"
    });
    return fail("Chữ ký webhook Facebook không hợp lệ.", 403, "FACEBOOK_SIGNATURE_INVALID");
  }

  const payload = JSON.parse(rawBody || "{}") as unknown;
  const events = parseFacebookWebhookPayload(payload);
  if (config.mode === "real") {
    const externalEventId =
      events.map((event) => (event.kind === "comment" ? event.externalCommentId : event.externalEventId)).join("|") ||
      `facebook_${crypto.randomUUID()}`;
    const saved = await saveIncomingEvent({
      sourceSystem: "facebook",
      targetSystem: "fbshv-crm",
      eventType: "facebook.webhook",
      externalEventId,
      signatureValid: true,
      processedStatus: "verified",
      payloadJson: { rawBody, signatureValid: true }
    });
    if (!saved.duplicate) {
      await enqueueIntegrationJob({
        sourceEventId: saved.event.id,
        jobType: "process_facebook_webhook_event",
        sourceSystem: "facebook",
        targetSystem: "fbshv-crm",
        idempotencyKey: externalEventId,
        payloadJson: { eventId: saved.event.id }
      });
    }
    // NEO: Webhook real-mode chỉ verify, save raw và enqueue trước khi trả 200.
    return ok({
      received: events.length,
      queued: saved.duplicate ? 0 : 1,
      duplicates: saved.duplicate ? 1 : 0,
      signatureValid,
      mode: config.mode
    });
  }

  let processed = 0;
  let duplicates = 0;
  const automation: Array<{ actionType: string; status: string; error?: string }> = [];

  for (const event of events) {
    let result;
    try {
      result = await persistParsedFacebookEvent(event, signatureValid);
    } catch (error) {
      return failFromError(error);
    }
    if (result.duplicate) {
      duplicates += 1;
    } else {
      processed += 1;
      automation.push(...(await runFacebookAutomation(event)));
    }
  }

  return ok({
    received: events.length,
    processed,
    duplicates,
    automation,
    signatureValid,
    mode: config.mode
  });
}
