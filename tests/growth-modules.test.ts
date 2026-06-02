import { beforeEach, describe, expect, it } from "vitest";
import { POST as createAdDraftRoute } from "@/app/api/ads/accounts/[accountId]/drafts/route";
import { GET as listContentPostsRoute } from "@/app/api/content/posts/route";
import { GET as listFacebookPages } from "@/app/api/facebook/pages/route";
import {
  buildCalendarSuggestions,
  createContentPost,
  resetContentPlannerMemoryForTests,
  scheduleContentPost
} from "@/lib/content-planner";
import { generateAiText } from "@/lib/ai/provider";
import {
  createPublishJobs,
  isAutoPublishPostsEnabled,
  listPublishJobs,
  resetContentPublishingMemoryForTests
} from "@/lib/content-publishing";
import { getAdsReadiness, publishAdDraft } from "@/lib/facebook/ads";
import { getMemoryFacebookStoreForTests } from "@/lib/facebook/store";
import { runPageAudit, resetPageAuditMemoryForTests } from "@/lib/page-audit";

describe("growth modules", () => {
  beforeEach(async () => {
    process.env.MOCK_ECOMMERCE_API = "true";
    process.env.MOCK_EXTERNAL_APIS = "true";
    process.env.AUTO_PUBLISH_POSTS_ENABLED = "false";
    getMemoryFacebookStoreForTests().resetForTests();
    resetContentPlannerMemoryForTests();
    resetContentPublishingMemoryForTests();
    resetPageAuditMemoryForTests();
    await getMemoryFacebookStoreForTests().upsertPage({
      id: "page_test_growth",
      workspaceId: "workspace-demo",
      externalPageId: "page_test_growth",
      name: "Page test growth",
      status: "connected",
      tokenStatus: "valid",
      subscribedWebhook: true,
      pictureUrl: "https://example.com/page.jpg",
      syncedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  });

  it("page audit scoring trả điểm và finding", async () => {
    const runs = await runPageAudit("page_test_growth");
    expect(runs).toHaveLength(1);
    expect(runs[0]!.score).toBeGreaterThan(0);
    expect(runs[0]!.findings.length).toBeGreaterThan(0);
  });

  it("content calendar generation tạo đủ lịch 7 ngày", () => {
    const suggestions = buildCalendarSuggestions(7);
    expect(suggestions).toHaveLength(7);
    expect(suggestions[0]!.suggestedTemplate).toBe("product_intro");
  });

  it("scheduled post idempotency cập nhật cùng bài thay vì tạo trùng", async () => {
    const post = await createContentPost({
      id: "post_test_1",
      pageId: "page_test_growth",
      title: "Bài test",
      caption: "Nội dung test",
      status: "draft"
    });
    const scheduledAt = new Date(Date.now() + 60_000).toISOString();
    await scheduleContentPost(post.id, scheduledAt);
    const scheduled = await scheduleContentPost(post.id, scheduledAt);
    expect(scheduled?.id).toBe(post.id);
    expect(scheduled?.status).toBe("scheduled");
  });

  it("AI fallback ghi rõ khi thiếu key", async () => {
    const result = await generateAiText({
      task: "caption",
      env: {}
    });
    expect(result.mode).toBe("template");
    expect(result.needUser).toBe("NEED_USER_AI_SECRET");
    expect(result.notice).toContain("AI chưa cấu hình");
  });

  it("publish nhiều Page tạo job riêng và chống trùng idempotency", async () => {
    const post = await createContentPost({
      id: "post_publish_1",
      pageId: "page_test_growth",
      title: "Bài đăng nhiều Page",
      caption: "Nội dung thật do operator nhập",
      status: "draft"
    });
    const first = await createPublishJobs({
      postId: post.id,
      pageIds: ["page_test_growth", "page_test_second"],
      publishNow: true
    });
    const second = await createPublishJobs({
      postId: post.id,
      pageIds: ["page_test_growth", "page_test_second"],
      publishNow: true
    });
    expect(first).toHaveLength(2);
    expect(second).toHaveLength(2);
    expect(await listPublishJobs(post.id)).toHaveLength(2);
    expect(first.every((job) => job.dryRun)).toBe(true);
  });

  it("Content Planner API trả đúng publish setting để UI cảnh báo publish thật", async () => {
    process.env.AUTO_PUBLISH_POSTS_ENABLED = "true";
    expect(isAutoPublishPostsEnabled()).toBe(true);
    const response = await listContentPostsRoute();
    const payload = await response.json() as { data: { publishSettings: { autoPublishEnabled: boolean } } };
    expect(payload.data.publishSettings.autoPublishEnabled).toBe(true);
  });

  it("Ads read-only thiếu permission trả blocked, write bị chặn bởi cờ an toàn", async () => {
    const readiness = await getAdsReadiness();
    expect(readiness.status).toBe("blocked");
    expect(readiness.missingPermissions).toContain("ads_read");
    await expect(publishAdDraft("draft_test")).rejects.toThrow("AD_WRITE_ACTIONS_DISABLED");
  });

  it("API Fanpage public không trả token đã mã hóa ra trình duyệt", async () => {
    const response = await listFacebookPages();
    const payload = await response.json() as { data: { pages: Array<Record<string, unknown>> } };
    expect(payload.data.pages).toHaveLength(1);
    expect(payload.data.pages[0]).not.toHaveProperty("pageAccessTokenEncrypted");
    expect(payload.data.pages[0]).not.toHaveProperty("connectionId");
  });

  it("API Ads draft chặn ngân sách âm trước khi lưu", async () => {
    const response = await createAdDraftRoute(
      new Request("http://localhost/api/ads/accounts/act_test/drafts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "Draft test", budgetDaily: -1 })
      }),
      { params: Promise.resolve({ accountId: "act_test" }) }
    );
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ success: false, code: "INVALID_AD_DRAFT" });
  });
});
