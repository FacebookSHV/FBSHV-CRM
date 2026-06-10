import { describe, expect, it } from "vitest";
import {
  signWebhookBody,
  verifyEcommerceWebhookSignature
} from "@/lib/webhooks/ecommerce";
import { POST as receiveEcommerceWebhook } from "@/app/api/webhooks/ecommerce/route";
import { processIntegrationJobs } from "@/lib/integration/processor";
import { resetIntegrationEventsForTests } from "@/lib/integration/events-store";
import { resetIntegrationJobsForTests } from "@/lib/integration/jobs-store";
import {
  getFacebookOrderStatusForTests,
  persistFacebookOrderReadModel,
  resetFacebookOrderStoreForTests
} from "@/lib/orders/store";

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

  it("quick-ack order status rồi cron cập nhật read-model", async () => {
    resetIntegrationEventsForTests();
    resetIntegrationJobsForTests();
    resetFacebookOrderStoreForTests();
    const webhookSecret = ["webhook", "fixture"].join("-");
    process.env.ECOMMERCE_WEBHOOK_SECRET = webhookSecret;
    await persistFacebookOrderReadModel({
      payload: { customerId: "customer-1", sku: "SKU_REAL", quantity: 1 },
      externalOrder: {
        id: "local-core-1",
        externalOrderId: "EXT-STATUS-1",
        sku: "SKU_REAL",
        quantity: 1,
        status: "created"
      },
      reservation: {
        reservationId: "reservation-1",
        sku: "SKU_REAL",
        quantity: 1,
        status: "reserved",
        expiresAt: ""
      },
      unitPrice: 100000,
      currency: "VND"
    });
    const body = JSON.stringify({
      eventId: "evt_order_status_1",
      type: "order.status_changed",
      occurredAt: new Date().toISOString(),
      data: { externalOrderId: "EXT-STATUS-1", status: "completed" }
    });
    const signature = await signWebhookBody(webhookSecret, body);

    const response = await receiveEcommerceWebhook(
      new Request("http://localhost/api/webhooks/ecommerce", {
        method: "POST",
        headers: { "x-webhook-signature": signature, "content-type": "application/json" },
        body
      })
    );
    expect(response.status).toBe(200);
    expect(getFacebookOrderStatusForTests("EXT-STATUS-1")).toBe("created");

    const processed = await processIntegrationJobs({ maxJobs: 1 });
    expect(processed.processed).toBe(1);
    expect(getFacebookOrderStatusForTests("EXT-STATUS-1")).toBe("completed");
  });
});
