import { describe, expect, it, beforeEach } from "vitest";
import { GET as verifyFacebookWebhook, POST as receiveFacebookWebhook } from "@/app/api/webhooks/facebook/route";
import { MockFacebookClient } from "@/lib/facebook/client";
import { getFacebookRuntimeConfig } from "@/lib/facebook/env";
import { FACEBOOK_OAUTH_SCOPES } from "@/lib/facebook/oauth";
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
    getMemoryFacebookStoreForTests().resetForTests();
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

  it("OAuth chỉ xin quyền tối thiểu cho Page discovery và đọc engagement", () => {
    expect(FACEBOOK_OAUTH_SCOPES).toEqual(["pages_show_list", "pages_manage_metadata", "pages_read_engagement"]);
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

  it("mock Facebook client không gọi Meta thật", async () => {
    const client = new MockFacebookClient();
    const token = await client.exchangeCodeForUserToken();
    const pages = await client.listPages();
    expect(token.accessToken).toBe("mock-user-token");
    expect(pages[0]?.accessToken).toBe("mock-page-token");
  });
});
