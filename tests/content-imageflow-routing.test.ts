import { readFile } from "node:fs/promises";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

const createContentPost = vi.fn();
const deleteContentPost = vi.fn();
const updateContentPost = vi.fn();
const addContentPostTargets = vi.fn();
const replaceContentPostTargets = vi.fn();
const ensureImageflowJobForPost = vi.fn();

vi.mock("@/lib/content-planner", () => ({
  createContentPost,
  deleteContentPost,
  updateContentPost,
  listContentPosts: vi.fn(async () => [])
}));

vi.mock("@/lib/content-publishing", () => ({
  addContentPostTargets,
  replaceContentPostTargets,
  isAutoPublishPostsEnabled: vi.fn(() => false)
}));

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
});
