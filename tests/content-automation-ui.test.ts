import { beforeEach, describe, expect, it, vi } from "vitest";

const runDailyFacebookContentAutomation = vi.fn();
const getContentAutomationStatus = vi.fn();

vi.mock("@/lib/content-auto-planner", () => ({
  runDailyFacebookContentAutomation
}));

vi.mock("@/lib/content-runtime", () => ({
  getContentAutomationStatus
}));

describe("Content Planner operator automation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getContentAutomationStatus.mockResolvedValue({
      autoPublishEnabled: false,
      automationConfigured: true,
      operatorRunEnabled: true
    });
    runDailyFacebookContentAutomation.mockResolvedValue({
      date: "2026-06-13",
      mode: "scheduled",
      pages: [],
      created: [],
      held: [],
      publishDue: { dueCount: 0, publishedCount: 0, waitingMediaCount: 0, failedCount: 0, jobs: [] }
    });
  });

  it("chặn request chạy lịch tự động không cùng origin", async () => {
    const { POST } = await import("@/app/api/content/automation/run/route");
    const response = await POST(
      new Request("https://fbshv-crm.ngchihuy.workers.dev/api/content/automation/run", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "https://example.com",
          "sec-fetch-site": "cross-site"
        },
        body: JSON.stringify({ confirmation: "CREATE_TODAY_SCHEDULE" })
      })
    );

    expect(response.status).toBe(403);
    expect(runDailyFacebookContentAutomation).not.toHaveBeenCalled();
  });

  it("chỉ chạy khi operator xác nhận rõ hành động tạo lịch", async () => {
    const { POST } = await import("@/app/api/content/automation/run/route");
    const response = await POST(
      new Request("https://fbshv-crm.ngchihuy.workers.dev/api/content/automation/run", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "https://fbshv-crm.ngchihuy.workers.dev",
          "sec-fetch-site": "same-origin"
        },
        body: JSON.stringify({ confirmation: "CREATE_TODAY_SCHEDULE", date: "2026-06-13", pageIds: ["page_shop_huy_van"] })
      })
    );

    expect(response.status).toBe(200);
    expect(runDailyFacebookContentAutomation).toHaveBeenCalledWith({
      date: "2026-06-13",
      limit: undefined,
      dryRun: false,
      pageIds: ["page_shop_huy_van"]
    });
  });

  it("không mở nút vận hành khi production chưa bật quyền chạy từ UI", async () => {
    getContentAutomationStatus.mockResolvedValue({
      autoPublishEnabled: false,
      automationConfigured: true,
      operatorRunEnabled: false
    });
    const { POST } = await import("@/app/api/content/automation/run/route");
    const response = await POST(
      new Request("https://fbshv-crm.ngchihuy.workers.dev/api/content/automation/run", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "https://fbshv-crm.ngchihuy.workers.dev",
          "sec-fetch-site": "same-origin"
        },
        body: JSON.stringify({ confirmation: "CREATE_TODAY_SCHEDULE" })
      })
    );

    expect(response.status).toBe(403);
    expect(runDailyFacebookContentAutomation).not.toHaveBeenCalled();
  });
});
