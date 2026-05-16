import { describe, expect, it, beforeEach } from "vitest";
import { GET as verifyFacebookWebhook, POST as receiveFacebookWebhook } from "@/app/api/webhooks/facebook/route";
import { MockFacebookClient } from "@/lib/facebook/client";
import { detectVietnamesePhone, resetFacebookAutomationMemoryForTests } from "@/lib/facebook/automation";
import { getFacebookRuntimeConfig } from "@/lib/facebook/env";
import { FACEBOOK_OAUTH_SCOPES } from "@/lib/facebook/oauth";
import { withMetaPermission } from "@/lib/facebook/permissions";
import { getMemoryFacebookStoreForTests } from "@/lib/facebook/store";
import { parseFacebookWebhookPayload } from "@/lib/facebook/webhook";

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
    process.env.META_VERIFY_TOKEN = "verify_test";
    const request = new Request(
      "http://localhost/api/webhooks/facebook?hub.mode=subscribe&hub.verify_token=verify_test&hub.challenge=abc123"
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
