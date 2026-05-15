import { describe, expect, it } from "vitest";
import {
  signWebhookBody,
  verifyEcommerceWebhookSignature
} from "@/lib/webhooks/ecommerce";

describe("ecommerce webhook HMAC", () => {
  it("chấp nhận chữ ký đúng", async () => {
    const body = JSON.stringify({ eventId: "evt_1", type: "product.updated", occurredAt: new Date().toISOString(), data: {} });
    const signature = await signWebhookBody("secret", body);
    await expect(verifyEcommerceWebhookSignature("secret", body, signature)).resolves.toBe(true);
  });

  it("từ chối chữ ký sai", async () => {
    const body = JSON.stringify({ eventId: "evt_1", type: "product.updated", occurredAt: new Date().toISOString(), data: {} });
    await expect(verifyEcommerceWebhookSignature("secret", body, "sha256=bad")).resolves.toBe(false);
  });
});
