import { beforeEach, describe, expect, it } from "vitest";
import {
  buildCalendarSuggestions,
  createContentPost,
  resetContentPlannerMemoryForTests,
  scheduleContentPost
} from "@/lib/content-planner";
import { getMemoryFacebookStoreForTests } from "@/lib/facebook/store";
import { runPageAudit, resetPageAuditMemoryForTests } from "@/lib/page-audit";

describe("growth modules", () => {
  beforeEach(async () => {
    process.env.MOCK_ECOMMERCE_API = "true";
    process.env.MOCK_EXTERNAL_APIS = "true";
    getMemoryFacebookStoreForTests().resetForTests();
    resetContentPlannerMemoryForTests();
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
});
