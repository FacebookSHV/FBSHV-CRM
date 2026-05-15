import { fail, fromResult } from "@/lib/api-response";
import { getEcommerceProvider } from "@/lib/ecommerce/provider";
import { webhookEventSchema } from "@/lib/ecommerce/validation";
import { verifyEcommerceWebhookSignature } from "@/lib/webhooks/ecommerce";

export async function POST(request: Request) {
  const rawBody = await request.text();
  const secret = process.env.ECOMMERCE_WEBHOOK_SECRET;
  const valid = await verifyEcommerceWebhookSignature(
    secret ?? "",
    rawBody,
    request.headers.get("x-webhook-signature")
  );

  if (!valid) return fail("Webhook signature không hợp lệ", 401, "INVALID_SIGNATURE");

  const parsedJson = JSON.parse(rawBody) as unknown;
  const parsed = webhookEventSchema.safeParse(parsedJson);
  if (!parsed.success) return fail("Webhook payload không hợp lệ");

  return fromResult(await getEcommerceProvider().handleWebhookEvent(parsed.data));
}
