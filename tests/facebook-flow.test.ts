import { describe, expect, it, beforeEach } from "vitest";
import { GET as verifyFacebookWebhook, POST as receiveFacebookWebhook } from "@/app/api/webhooks/facebook/route";
import { MockFacebookClient } from "@/lib/facebook/client";
import { detectVietnamesePhone, resetFacebookAutomationMemoryForTests } from "@/lib/facebook/automation";
import { getFacebookRuntimeConfig } from "@/lib/facebook/env";
import { FACEBOOK_ADS_OAUTH_SCOPES, FACEBOOK_OAUTH_SCOPES } from "@/lib/facebook/oauth";
import { withMetaPermission } from "@/lib/facebook/permissions";
import { getMemoryFacebookStoreForTests } from "@/lib/facebook/store";
import { parseFacebookWebhookPayload, signFacebookWebhookBody } from "@/lib/facebook/webhook";
import { resetIntegrationEventsForTests } from "@/lib/integration/events-store";
import { resetIntegrationJobsForTests } from "@/lib/integration/jobs-store";
import { processIntegrationJobs } from "@/lib/integration/processor";

type WebhookResponsePayload = {
  success: boolean;
  data: {
    processed: number;
    duplicates: number;
  };
};

function messengerPayload(mid = "mid_test_1") {
  return {
    object: "page",
    entry: [
      {
        id: "page_test_1",
        messaging: [
          {
            sender: { id: "customer_test_1" },
            recipient: { id: "page_test_1" },
            timestamp: 1778832000000,
            message: { mid, text: "Shop còn hàng không?" }
          }
        ]
      }
    ]
  };
}

function commentPayload(commentId = "comment_test_1") {
  return {
    object: "page",
    entry: [
      {
        id: "page_test_1",
        changes: [
          {
            field: "feed",
            value: {
              item: "comment",
              comment_id: commentId,
              post_id: "post_test_1",
              message: "Giá bao nhiêu shop?",
              from: { id: "customer_test_2", name: "Nguyễn Test" }
            }
          }
        ]
      }
    ]
  };
}

describe("facebook real-flow helpers", () => {
  beforeEach(() => {
    process.env.MOCK_EXTERNAL_APIS = "true";
    process.env.AUTO_REPLY_MESSAGES_ENABLED = "false";
    process.env.AUTO_REPLY_COMMENTS_ENABLED = "false";
    process.env.AUTO_HIDE_PHONE_COMMENTS_ENABLED = "false";
    getMemoryFacebookStoreForTests().resetForTests();
    resetFacebookAutomationMemoryForTests();
    resetIntegrationEventsForTests();
    resetIntegrationJobsForTests();
  });

  it("env validation fail-fast khi tắt mock nhưng thiếu Meta secret", () => {
    const config = getFacebookRuntimeConfig({
      MOCK_EXTERNAL_APIS: "false",
      CRM_APP_URL: "https://crm.example.com"
    });
    expect(config.mode).toBe("real");
    expect(config.missing).toContain("META_APP_ID");
    expect(config.missing).toContain("META_APP_SECRET");
    expect(config.missing).toContain("META_VERIFY_TOKEN");
    expect(config.missing).toContain("ENCRYPTION_KEY");
  });

  it("verify GET webhook bằng verify token", async () => {
    process.env.META_VERIFY_TOKEN = "verify";
    const request = new Request(
      "http://localhost/api/webhooks/facebook?hub.mode=subscribe&hub.verify_token=verify&hub.challenge=abc123"
    );
    const response = await verifyFacebookWebhook(request);
    await expect(response.text()).resolves.toBe("abc123");
  });

  it("OAuth xin quyền Page cần thiết và không chứa business/ads scopes", () => {
    expect(FACEBOOK_OAUTH_SCOPES).toEqual([
      "pages_show_list",
      "pages_manage_metadata",
      "pages_read_engagement",
      "pages_messaging",
      "pages_manage_engagement",
      "pages_manage_posts"
    ]);
    expect(FACEBOOK_OAUTH_SCOPES).not.toContain("business_management");
    expect(FACEBOOK_OAUTH_SCOPES).not.toContain("ads_read");
    expect(FACEBOOK_OAUTH_SCOPES).not.toContain("ads_management");
  });

  it("OAuth intent Ads xin them ads_management cho live-write rieng", () => {
    expect(FACEBOOK_ADS_OAUTH_SCOPES).toContain("business_management");
    expect(FACEBOOK_ADS_OAUTH_SCOPES).toContain("ads_read");
    expect(FACEBOOK_ADS_OAUTH_SCOPES).toContain("ads_management");
  });

  it("phát hiện số điện thoại Việt Nam trong bình luận", () => {
    expect(detectVietnamesePhone("Shop gọi em 090 123 4567 nhé")).toBe(true);
    expect(detectVietnamesePhone("Số của em +84 97-123-4567")).toBe(true);
    expect(detectVietnamesePhone("Liên hệ 03.1234.5678 giúp em")).toBe(true);
    expect(detectVietnamesePhone("Mã SKU ABC-12345 không phải số điện thoại")).toBe(false);
  });

  it("parse Messenger message", () => {
    const parsed = parseFacebookWebhookPayload(messengerPayload());
    expect(parsed).toHaveLength(1);
    expect(parsed[0]?.kind).toBe("message");
    if (parsed[0]?.kind === "message") expect(parsed[0].text).toBe("Shop còn hàng không?");
  });

  it("parse comment event", () => {
    const parsed = parseFacebookWebhookPayload(commentPayload());
    expect(parsed).toHaveLength(1);
    expect(parsed[0]?.kind).toBe("comment");
    if (parsed[0]?.kind === "comment") expect(parsed[0].externalCommentId).toBe("comment_test_1");
  });

  it("POST webhook chống duplicate theo external event id", async () => {
    const body = JSON.stringify(messengerPayload("mid_duplicate"));
    const first = await receiveFacebookWebhook(new Request("http://localhost/api/webhooks/facebook", { method: "POST", body }));
    const second = await receiveFacebookWebhook(new Request("http://localhost/api/webhooks/facebook", { method: "POST", body }));
    const firstPayload = (await first.json()) as WebhookResponsePayload;
    const secondPayload = (await second.json()) as WebhookResponsePayload;
    expect(firstPayload.data.processed).toBe(1);
    expect(firstPayload.data.duplicates).toBe(0);
    expect(secondPayload.data.processed).toBe(0);
    expect(secondPayload.data.duplicates).toBe(1);
  });

  it("real webhook quick-ack enqueue trước, processor xử lý message sau", async () => {
    process.env.MOCK_EXTERNAL_APIS = "false";
    process.env.META_APP_ID = "1296077039298909";
    process.env.META_APP_SECRET = ["unit", "test", "meta", "fixture"].join("-");
    process.env.META_VERIFY_TOKEN = "verify";
    process.env.CRM_APP_URL = "https://fbshv-crm.ngchihuy.workers.dev";
    process.env.ENCRYPTION_KEY = ["unit", "test", "encryption", "fixture", "long"].join("-");
    const body = JSON.stringify(messengerPayload("mid_quick_ack"));
    const signature = await signFacebookWebhookBody(process.env.META_APP_SECRET, body);

    const response = await receiveFacebookWebhook(
      new Request("http://localhost/api/webhooks/facebook", {
        method: "POST",
        body,
        headers: { "x-hub-signature-256": signature }
      })
    );
    const payload = (await response.json()) as { success: boolean; data: { queued: number; processed?: number } };
    expect(response.status).toBe(200);
    expect(payload.data.queued).toBe(1);
    expect(payload.data.processed).toBeUndefined();
    expect(await getMemoryFacebookStoreForTests().listMessages("conv_page_test_1_customer_test_1")).toHaveLength(0);

    process.env.MOCK_EXTERNAL_APIS = "true";
    const processed = await processIntegrationJobs({ maxJobs: 1 });
    expect(processed.results[0]?.status, JSON.stringify(processed)).toBe("completed");
    expect(await getMemoryFacebookStoreForTests().listMessages("conv_page_test_1_customer_test_1")).toHaveLength(1);
  });

  it("auto reply message không gửi trùng khi webhook retry", async () => {
    process.env.AUTO_REPLY_MESSAGES_ENABLED = "true";
    const body = JSON.stringify(messengerPayload("mid_auto_reply"));
    await receiveFacebookWebhook(new Request("http://localhost/api/webhooks/facebook", { method: "POST", body }));
    await receiveFacebookWebhook(new Request("http://localhost/api/webhooks/facebook", { method: "POST", body }));

    const messages = await getMemoryFacebookStoreForTests().listMessages("conv_page_test_1_customer_test_1");
    expect(messages.filter((message) => message.direction === "outbound")).toHaveLength(1);
  });

  it("auto reply comment và auto hide số điện thoại không chạy trùng", async () => {
    process.env.AUTO_REPLY_COMMENTS_ENABLED = "true";
    process.env.AUTO_HIDE_PHONE_COMMENTS_ENABLED = "true";
    const payload = commentPayload("comment_phone_auto");
    payload.entry[0]!.changes[0]!.value.message = "Shop gọi 090.123.4567 giúp em";
    const body = JSON.stringify(payload);

    await receiveFacebookWebhook(new Request("http://localhost/api/webhooks/facebook", { method: "POST", body }));
    await receiveFacebookWebhook(new Request("http://localhost/api/webhooks/facebook", { method: "POST", body }));

    const comment = (await getMemoryFacebookStoreForTests().listComments()).find(
      (item) => item.externalCommentId === "comment_phone_auto"
    );
    expect(comment?.hidden).toBe(true);
    expect(comment?.replied).toBe(true);
  });

  it("thiếu quyền Meta trả BLOCKED_META_PERMISSION_MISSING", async () => {
    await expect(
      withMetaPermission("pages_messaging", async () => {
        throw new Error("Meta permission denied");
      })
    ).rejects.toThrow("BLOCKED_META_PERMISSION_MISSING: pages_messaging");
  });

  it("mock Facebook client không gọi Meta thật", async () => {
    const client = new MockFacebookClient();
    const token = await client.exchangeCodeForUserToken();
    const pages = await client.listPages();
    expect(token.accessToken).toBe("mock-user-token");
    expect(pages[0]?.accessToken).toBe("mock-page-token");
  });
});
