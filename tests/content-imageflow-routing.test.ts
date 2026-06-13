import { readFile } from "node:fs/promises";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

const createContentPost = vi.fn();
const deleteContentPost = vi.fn();
const updateContentPost = vi.fn();
const listContentPosts = vi.fn();
const listContentMedia = vi.fn();
const addContentPostTargets = vi.fn();
const replaceContentPostTargets = vi.fn();
const listPublishJobs = vi.fn();
const deletePagePost = vi.fn();
const ensureImageflowJobForPost = vi.fn();

vi.mock("@/lib/content-planner", () => ({
  createContentPost,
  deleteContentPost,
  updateContentPost,
  listContentPosts
}));

vi.mock("@/lib/content-media", () => ({ listContentMedia }));

vi.mock("@/lib/content-publishing", () => ({
  addContentPostTargets,
  replaceContentPostTargets,
  listPublishJobs,
  isAutoPublishPostsEnabled: vi.fn(() => false)
}));

vi.mock("@/lib/facebook/publishing", () => ({ deletePagePost }));

vi.mock("@/lib/imageflow/store", () => ({
  ensureImageflowJobForPost
}));

describe("Content Planner ImageFlow routing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createContentPost.mockResolvedValue({
      id: "post_pool_1",
      pageId: "page_1",
      productSku: "SKU_POOL_1",
      title: "Bài viết dùng Pool Scheduler",
      caption: "Nội dung",
      status: "draft"
    });
    addContentPostTargets.mockResolvedValue(["page_1"]);
    ensureImageflowJobForPost.mockResolvedValue({ id: "job_pool_1", status: "queued" });
    deleteContentPost.mockResolvedValue({ deleted: true });
    deletePagePost.mockResolvedValue({ deleted: true });
    listPublishJobs.mockResolvedValue([]);
    listContentMedia.mockResolvedValue([]);
    listContentPosts.mockResolvedValue([
      {
        id: "post_pool_1",
        pageId: "page_1",
        productSku: "SKU_POOL_1",
        title: "Bài viết dùng Pool Scheduler",
        caption: "Nội dung",
        cta: "Nhắn tin",
        status: "draft"
      }
    ]);
  });

  it("tự tạo một job ảnh gắn postId khi bài chưa có media", async () => {
    const { POST } = await import("@/app/api/content/posts/route");
    const response = await POST(
      new Request("http://localhost/api/content/posts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          pageId: "page_1",
          pageIds: ["page_1"],
          productSku: "SKU_POOL_1",
          title: "Bài viết dùng Pool Scheduler",
          caption: "Nội dung",
          autoCreateImageflow: true
        })
      })
    );

    expect(response.status).toBe(200);
    expect(ensureImageflowJobForPost).toHaveBeenCalledWith(
      expect.objectContaining({ postId: "post_pool_1", productSku: "SKU_POOL_1" })
    );
    await expect(response.json()).resolves.toMatchObject({
      success: true,
      data: { imageflowJob: { id: "job_pool_1", status: "queued" } }
    });
  });

  it("không tạo job tự động khi operator đã chọn hoặc tải media", async () => {
    const { POST } = await import("@/app/api/content/posts/route");
    const response = await POST(
      new Request("http://localhost/api/content/posts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          pageId: "page_1",
          productSku: "SKU_POOL_1",
          title: "Bài có ảnh sẵn",
          caption: "Nội dung",
          autoCreateImageflow: false
        })
      })
    );

    expect(response.status).toBe(200);
    expect(ensureImageflowJobForPost).not.toHaveBeenCalled();
  });

  it("API danh sách bài trả ảnh và trạng thái đăng để dựng preview", async () => {
    listContentMedia.mockResolvedValue([{ id: "media_1", publicUrl: "https://crm.test/image.jpg", status: "uploaded" }]);
    listPublishJobs.mockResolvedValue([{ id: "publish_1", status: "scheduled", pageId: "page_1" }]);
    const { GET } = await import("@/app/api/content/posts/route");
    const response = await GET();
    const payload = await response.json() as {
      data: { posts: Array<{ media: unknown[]; publishJobs: unknown[] }> };
    };

    expect(payload.data.posts[0].media).toHaveLength(1);
    expect(payload.data.posts[0].publishJobs).toHaveLength(1);
  });

  it("nút Tạo ảnh AI chỉ xếp lại đúng job Pool Scheduler theo postId", async () => {
    const { POST } = await import("@/app/api/content/posts/[id]/imageflow/route");
    const response = await POST(
      new Request("http://localhost/api/content/posts/post_pool_1/imageflow", { method: "POST" }),
      { params: Promise.resolve({ id: "post_pool_1" }) }
    );

    expect(response.status).toBe(200);
    expect(ensureImageflowJobForPost).toHaveBeenCalledWith(
      expect.objectContaining({ postId: "post_pool_1", productSku: "SKU_POOL_1" })
    );
    await expect(response.json()).resolves.toMatchObject({
      success: true,
      data: { imageflowJob: { id: "job_pool_1", status: "queued" } }
    });
  });

  it("xóa bài đã đăng khỏi Meta trước khi dọn dữ liệu CRM", async () => {
    listPublishJobs.mockResolvedValue([
      { pageId: "page_1", externalPostId: "page_1_post_1", status: "published" }
    ]);
    const { DELETE } = await import("@/app/api/content/posts/[id]/route");
    const response = await DELETE(
      new Request("http://localhost/api/content/posts/post_pool_1?scope=facebook", { method: "DELETE" }),
      { params: Promise.resolve({ id: "post_pool_1" }) }
    );

    expect(response.status).toBe(200);
    expect(deletePagePost).toHaveBeenCalledWith({ pageId: "page_1", externalPostId: "page_1_post_1" });
    expect(deleteContentPost).toHaveBeenCalledWith("post_pool_1", { crmOnly: true });
  });

  it("xoá CRM-only truyền cờ rõ ràng và không gọi Meta", async () => {
    const { DELETE } = await import("@/app/api/content/posts/[id]/route");
    const response = await DELETE(
      new Request("http://localhost/api/content/posts/post_pool_1?scope=crm", { method: "DELETE" }),
      { params: Promise.resolve({ id: "post_pool_1" }) }
    );

    expect(response.status).toBe(200);
    expect(deleteContentPost).toHaveBeenCalledWith("post_pool_1", { crmOnly: true });
    await expect(response.json()).resolves.toMatchObject({
      success: true,
      data: { deleted: true, scope: "crm" }
    });
  });
});

describe("CRM chỉ dùng Pool Scheduler của ImageFlow", () => {
  it("adapter không đọc config hoặc truyền profile ID trực tiếp", async () => {
    const adapter = await readFile(path.join(process.cwd(), "scripts", "imageflow-crm-adapter.mjs"), "utf8");
    expect(adapter).toContain("/api/pool/status");
    expect(adapter).toContain('"prompt_core_migration_state.json"');
    expect(adapter).toContain("/^prompt_manifest_.*\\.json$/i");
    expect(adapter).not.toContain("if (error && finalPaths.length < requestedCount)");
    expect(adapter).not.toContain("readImageflowProfiles");
    expect(adapter).not.toContain("IMAGEFLOW_CONFIG_PATH");
    expect(adapter).not.toContain("prompt_profile_ids");
    expect(adapter).not.toContain("render_profile_ids");
  });

  it("worker kiểm Pool Scheduler trước khi claim job", async () => {
    const bridge = await readFile(path.join(process.cwd(), "scripts", "imageflow-bridge.mjs"), "utf8");
    expect(bridge).toContain("/api/pool/status");
    expect(bridge).toContain("Pool Scheduler chưa sẵn sàng");
  });

  it("không còn menu vận hành Cầu nối ảnh AI riêng", async () => {
    const nav = await readFile(path.join(process.cwd(), "src", "components", "shell", "nav-items.ts"), "utf8");
    expect(nav).not.toContain('href: "/imageflow-bridge"');
    expect(nav).not.toContain("Cầu nối ảnh AI");
  });

  it("Content Planner có nút dọn trống và chỉ gọi delete scope CRM", async () => {
    const content = await readFile(
      path.join(process.cwd(), "src", "components", "facebook", "content-planner-content.tsx"),
      "utf8"
    );
    const list = await readFile(
      path.join(process.cwd(), "src", "components", "facebook", "content-planner-post-list.tsx"),
      "utf8"
    );
    expect(content).toContain("?scope=crm");
    expect(list).toContain("Dọn trống planner");
    expect(list).toContain("Bài thật trên Facebook hoàn toàn không bị xoá");
  });

  it("Content Planner hiển thị hành động AI và tự động đăng bằng ngôn ngữ người dùng cuối", async () => {
    const content = await readFile(
      path.join(process.cwd(), "src", "components", "facebook", "content-planner-content.tsx"),
      "utf8"
    );
    const editor = await readFile(
      path.join(process.cwd(), "src", "components", "facebook", "content-planner-editor.tsx"),
      "utf8"
    );
    const automation = await readFile(
      path.join(process.cwd(), "src", "components", "facebook", "content-automation", "automation-panel.tsx"),
      "utf8"
    );
    expect(editor).toContain("AI soạn bài");
    expect(editor).toContain("Tạo ảnh AI");
    expect(automation).toContain("Tự động lên lịch 4 bài hôm nay");
    expect(automation).not.toContain("cron");
    expect(content).toContain("Lộ trình phát triển Fanpage");
  });
});
