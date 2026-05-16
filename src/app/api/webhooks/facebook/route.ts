import { fail, failFromError, ok } from "@/lib/api-response";
import { runFacebookAutomation } from "@/lib/facebook/automation";
import { getFacebookRuntimeConfig } from "@/lib/facebook/env";
import { persistParsedFacebookEvent } from "@/lib/facebook/operations";
import {
  parseFacebookWebhookPayload,
  verifyFacebookWebhookChallenge,
  verifyFacebookWebhookSignature
} from "@/lib/facebook/webhook";

export async function GET(request: Request) {
  const config = getFacebookRuntimeConfig();
  const verified = verifyFacebookWebhookChallenge(new URL(request.url), config.verifyToken);
  if (!verified.ok) return new Response("Forbidden", { status: 403 });
  return new Response(verified.challenge, { status: 200 });
}

export async function POST(request: Request) {
  const config = getFacebookRuntimeConfig();
  const rawBody = await request.text();
  const signature = request.headers.get("x-hub-signature-256");

  if (config.mode === "real" && !config.appSecret) {
    return fail("BLOCKED_BY_MISSING_SECRET: META_APP_SECRET", 400, "BLOCKED_BY_MISSING_SECRET");
  }

  const signatureValid = await verifyFacebookWebhookSignature(config.appSecret, rawBody, signature);
  if (config.mode === "real" && !signatureValid) {
    return fail("Chữ ký webhook Facebook không hợp lệ.", 401, "FACEBOOK_SIGNATURE_INVALID");
  }

  const payload = JSON.parse(rawBody || "{}") as unknown;
  const events = parseFacebookWebhookPayload(payload);
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
