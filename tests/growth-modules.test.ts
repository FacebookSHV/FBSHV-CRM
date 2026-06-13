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
  publishDueContentJobs,
  resetContentPublishingMemoryForTests
} from "@/lib/content-publishing";
import { getAdsReadiness, publishAdDraft } from "@/lib/facebook/ads";
import { getBusinessSdkStatus } from "@/lib/facebook/business-sdk";
import { getMemoryFacebookStoreForTests } from "@/lib/facebook/store";
import { getConversionsStatus, sendMetaConversionEvent } from "@/lib/meta/conversions";
import { runPageAudit, resetPageAuditMemoryForTests } from "@/lib/page-audit";
import { pageMatchesTarget, runDailyFacebookContentAutomation, selectAutoCaption } from "@/lib/content-auto-planner";

describe("growth modules", () => {
  beforeEach(async () => {
    process.env.MOCK_ECOMMERCE_API = "true";
    process.env.MOCK_EXTERNAL_APIS = "true";
    process.env.AUTO_PUBLISH_POSTS_ENABLED = "false";
    delete process.env.META_PIXEL_ID;
    delete process.env.META_CAPI_ACCESS_TOKEN;
    delete process.env.META_TEST_EVENT_CODE;
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

  it("auto planner nhận đúng alias Shop Gia Dụng thay cho tên Kho cũ", () => {
    expect(pageMatchesTarget("Shop Gia Dụng Huy Vân", "Kho Gia Dụng Huy Vân")).toBe(true);
    expect(pageMatchesTarget("Shop Huy Vân", "Shop Huy Vân")).toBe(true);
    expect(pageMatchesTarget("Hủ Tíu Mì Hủ Hủ Mì", "Kho Gia Dụng Huy Vân")).toBe(false);
  });

  it("auto planner dùng caption an toàn khi AI bị cắt giữa câu", () => {
    const fallback = "Nội dung an toàn. Nhắn tin cho shop.";
    const complete = `${"Giới thiệu sản phẩm thật và lợi ích rõ ràng. ".repeat(4)}Nhắn tin cho shop.`;
    expect(selectAutoCaption("Nội dung đang viết dở và kết thúc bằng chữ Shop", fallback)).toBe(fallback);
    expect(selectAutoCaption(complete, fallback)).toBe(complete);
  });

  it("auto planner chạy đúng Fanpage người dùng chọn thay vì page hard-code", async () => {
    await getMemoryFacebookStoreForTests().upsertPage({
      id: "page_not_selected",
      workspaceId: "workspace-demo",
      externalPageId: "page_not_selected",
      name: "Shop Gia Dụng Huy Vân",
      status: "connected",
      tokenStatus: "valid",
      subscribedWebhook: true,
      pictureUrl: "https://example.com/page-2.jpg",
      syncedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    const result = await runDailyFacebookContentAutomation({
      date: "2099-06-14",
      dryRun: true,
      pageIds: ["page_test_growth"]
    });

    expect(result.pages.map((page) => page.id)).toEqual(["page_test_growth"]);
    expect(result.created.length).toBeGreaterThan(0);
    expect(result.created.every((item) => item.post.pageId === "page_test_growth")).toBe(true);
  });

  it("auto planner splits 2 selected pages into different A/B content", async () => {
    await getMemoryFacebookStoreForTests().upsertPage({
      id: "page_test_ab",
      workspaceId: "workspace-demo",
      externalPageId: "page_test_ab",
      name: "Shop Huy Van",
      status: "connected",
      tokenStatus: "valid",
      subscribedWebhook: true,
      pictureUrl: "https://example.com/page-ab.jpg",
      syncedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    const result = await runDailyFacebookContentAutomation({
      date: "2099-06-14",
      dryRun: true,
      pageIds: ["page_test_growth", "page_test_ab"]
    });

    expect(new Set(result.pages.map((page) => page.id))).toEqual(new Set(["page_test_growth", "page_test_ab"]));
    expect(new Set(result.created.map((item) => item.post.pageId))).toEqual(new Set(["page_test_growth", "page_test_ab"]));
    expect(new Set(result.created.map((item) => item.productSku)).size).toBe(result.created.length);
    expect(new Set(result.created.map((item) => item.post.caption)).size).toBeGreaterThan(1);
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

  it("scheduled publish không đăng ngay và chờ ảnh ImageFlow trước khi tới giờ", async () => {
    process.env.AUTO_PUBLISH_POSTS_ENABLED = "true";
    const post = await createContentPost({
      id: "post_scheduled_auto_1",
      pageId: "page_test_growth",
      title: "Bài tự động có lịch",
      caption: "Nội dung thật do AI tạo từ sản phẩm",
      status: "draft"
    });
    const scheduledAt = new Date(Date.now() - 60_000).toISOString();
    const jobs = await createPublishJobs({
      postId: post.id,
      pageIds: ["page_test_growth"],
      scheduledAt,
      publishNow: true
    });
    expect(jobs[0]?.status).toBe("scheduled");
    expect(jobs[0]?.dryRun).toBe(false);

    const due = await publishDueContentJobs({ now: new Date().toISOString() });
    expect(due.dueCount).toBe(1);
    expect(due.waitingMediaCount).toBe(1);
    expect((await listPublishJobs(post.id))[0]?.error).toBe("WAITING_IMAGEFLOW_ASSETS");
  });

  it("publish ngay vẫn chờ ảnh thay vì đăng bài chữ khi chưa có media", async () => {
    process.env.AUTO_PUBLISH_POSTS_ENABLED = "true";
    const post = await createContentPost({
      id: "post_publish_waiting_image_1",
      pageId: "page_test_growth",
      title: "Bài phải chờ ảnh",
      caption: "Không được đăng bài chữ khi ảnh đang xử lý",
      status: "draft"
    });

    const jobs = await createPublishJobs({
      postId: post.id,
      pageIds: ["page_test_growth"],
      publishNow: true,
      waitForMedia: true
    });

    expect(jobs[0]?.status).toBe("scheduled");
    expect(jobs[0]?.error).toBe("WAITING_IMAGEFLOW_ASSETS");
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

  it("Meta Business SDK chính thức đã cài và có object Ads nền", async () => {
    const status = await getBusinessSdkStatus();
    expect(status.installed).toBe(true);
    expect(status.usable).toBe(true);
    expect(status.provider).toBe("facebook/facebook-nodejs-business-sdk");
  });

  it("Meta CAPI phân loại thiếu Pixel/token, không fake gửi thành công", async () => {
    await expect(sendMetaConversionEvent({ eventName: "Purchase", eventId: "evt_missing_capi_test" }))
      .rejects.toThrow("META_CAPI_CONFIG_MISSING");
    const status = await getConversionsStatus();
    expect(status.configured).toBe(false);
    expect(status.pixelConfigured).toBe(false);
    expect(status.accessTokenConfigured).toBe(false);
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
