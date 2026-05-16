"use client";

import { CalendarPlus, FilePlus2, RefreshCcw, Send, Upload, WandSparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/pages/page-header";
import { StatusPill } from "@/components/ui/status-pill";

type ContentIdea = {
  id: string;
  pageId: string;
  productSku?: string | null;
  template: string;
  title: string;
  caption: string;
  cta: string;
  mediaSuggestion: string;
  aiMode?: "ai" | "template";
  aiNotice?: string;
};

type ContentPost = ContentIdea & {
  status: "draft" | "scheduled" | "published" | "failed" | "cancelled";
  scheduledAt?: string | null;
  updatedAt: string;
};

type FacebookPage = {
  id: string;
  name: string;
  externalPageId: string;
  tokenStatus: string;
};

type Suggestion = {
  date: string;
  suggestedTemplate: string;
  theme: string;
};

export function ContentPlannerContent() {
  const [ideas, setIdeas] = useState<ContentIdea[]>([]);
  const [posts, setPosts] = useState<ContentPost[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [pages, setPages] = useState<FacebookPage[]>([]);
  const [selectedPageIds, setSelectedPageIds] = useState<string[]>([]);
  const [manualTitle, setManualTitle] = useState("");
  const [manualCaption, setManualCaption] = useState("");
  const [manualCta, setManualCta] = useState("Nhắn tin");
  const [manualSku, setManualSku] = useState("");
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [status, setStatus] = useState("Đang tải planner...");

  async function loadPlanner() {
    const [postsResponse, calendarResponse, pagesResponse] = await Promise.all([
      fetch("/api/content/posts", { cache: "no-store" }),
      fetch("/api/content/calendar/suggestions?days=7", { cache: "no-store" }),
      fetch("/api/facebook/pages", { cache: "no-store" })
    ]);
    const postsPayload = (await postsResponse.json()) as { success: boolean; data?: { posts: ContentPost[] } };
    const calendarPayload = (await calendarResponse.json()) as { success: boolean; data?: { suggestions: Suggestion[] } };
    const pagesPayload = (await pagesResponse.json()) as { success: boolean; data?: { pages: FacebookPage[] } };
    if (postsPayload.success && postsPayload.data) setPosts(postsPayload.data.posts);
    if (calendarPayload.success && calendarPayload.data) setSuggestions(calendarPayload.data.suggestions);
    if (pagesPayload.success && pagesPayload.data) {
      setPages(pagesPayload.data.pages);
      setSelectedPageIds((current) => (current.length ? current : pagesPayload.data?.pages.slice(0, 1).map((page) => page.id) ?? []));
    }
    setStatus("Planner sẵn sàng ở chế độ nháp/lên lịch.");
  }

  async function generateIdeas() {
    const response = await fetch("/api/content/posts/generate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ limit: 7 })
    });
    const payload = (await response.json()) as {
      success: boolean;
      data?: { ideas: ContentIdea[]; aiMode?: "ai" | "template"; notice?: string };
      error?: string;
    };
    if (payload.success && payload.data) {
      setIdeas(payload.data.ideas);
      setStatus(
        payload.data.aiMode === "ai"
          ? `Đã tạo ${payload.data.ideas.length} ý tưởng bằng AI thật từ sản phẩm TMĐT.`
          : payload.data.notice || `Đã tạo ${payload.data.ideas.length} ý tưởng bằng template fallback.`
      );
    } else {
      setStatus(payload.error || "Tạo ý tưởng lỗi.");
    }
  }

  async function saveDraft(idea: ContentIdea) {
    const response = await fetch("/api/content/posts", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...idea, pageIds: selectedPageIds, status: "draft" })
    });
    const payload = (await response.json()) as { success: boolean; error?: string };
    setStatus(payload.success ? "Đã lưu bài nháp." : payload.error || "Lưu bài lỗi.");
    await loadPlanner();
  }

  async function uploadMedia(postId: string) {
    if (!mediaFile) return true;
    const form = new FormData();
    form.set("file", mediaFile);
    const response = await fetch(`/api/content/posts/${encodeURIComponent(postId)}/media`, {
      method: "POST",
      body: form
    });
    const payload = (await response.json().catch(() => null)) as { success: boolean; error?: string } | null;
    if (!response.ok || !payload?.success) {
      setStatus(payload?.error || "Upload media lỗi.");
      return false;
    }
    return true;
  }

  async function saveManualDraft(publishNow = false) {
    const pageIds = selectedPageIds.length ? selectedPageIds : pages.slice(0, 1).map((page) => page.id);
    if (!manualTitle.trim() || !manualCaption.trim()) {
      setStatus("Cần nhập tiêu đề và caption trước khi lưu.");
      return;
    }
    if (pageIds.length === 0) {
      setStatus("Chưa có Fanpage để lưu target bài đăng.");
      return;
    }
    const response = await fetch("/api/content/posts", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title: manualTitle,
        caption: manualCaption,
        cta: manualCta,
        productSku: manualSku || null,
        pageId: pageIds[0],
        pageIds,
        status: "draft"
      })
    });
    const payload = (await response.json()) as { success: boolean; data?: { post: ContentPost }; error?: string };
    if (!payload.success || !payload.data) {
      setStatus(payload.error || "Lưu bài thủ công lỗi.");
      return;
    }
    const uploaded = await uploadMedia(payload.data.post.id);
    if (!uploaded) return;
    if (publishNow) await publishPost(payload.data.post, pageIds);
    setManualTitle("");
    setManualCaption("");
    setManualSku("");
    setMediaFile(null);
    setStatus(publishNow ? "Đã tạo job publish theo từng Page." : "Đã lưu bài nháp thủ công.");
    await loadPlanner();
  }

  async function schedulePost(post: ContentPost) {
    const date = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const response = await fetch(`/api/content/posts/${encodeURIComponent(post.id)}/schedule`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ scheduledAt: date, pageIds: selectedPageIds })
    });
    const payload = (await response.json()) as { success: boolean; error?: string };
    setStatus(payload.success ? "Đã lên lịch bài viết." : payload.error || "Lên lịch lỗi.");
    await loadPlanner();
  }

  async function publishPost(post: ContentPost, pageIds = selectedPageIds) {
    const response = await fetch(`/api/content/posts/${encodeURIComponent(post.id)}/publish`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ pageIds, publishNow: true })
    });
    const payload = (await response.json()) as {
      success: boolean;
      data?: { jobs: Array<{ status: string; dryRun: boolean; pageId: string }> };
      error?: string;
    };
    if (payload.success && payload.data) {
      const dryRun = payload.data.jobs.every((job) => job.dryRun);
      setStatus(dryRun ? "Đã tạo publish job dry-run; chưa đăng thật vì AUTO_PUBLISH_POSTS_ENABLED chưa bật." : "Đã gửi publish job thật.");
    } else {
      setStatus(payload.error || "Tạo publish job lỗi.");
    }
    await loadPlanner();
  }

  useEffect(() => {
    void loadPlanner();
  }, []);

  return (
    <div>
      <PageHeader
        title="Content Planner"
        subtitle="Tạo bài nháp và lịch đăng cho Page dựa trên sản phẩm, tồn kho và audit."
        action={
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void loadPlanner()}
              className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-700 focus-ring"
              aria-label="Tải lại"
              title="Tải lại"
            >
              <RefreshCcw className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => void generateIdeas()}
              className="inline-flex min-h-10 items-center gap-2 rounded-md bg-brand-600 px-3 text-sm font-semibold text-white focus-ring"
            >
              <WandSparkles className="h-4 w-4" aria-hidden="true" />
              Tạo ý tưởng
            </button>
          </div>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2 rounded-md border border-slate-200 bg-white p-3 shadow-soft">
        <StatusPill tone="info">Không tự publish hàng loạt</StatusPill>
        <StatusPill tone="warning">Ads chỉ readiness</StatusPill>
        <span className="text-sm text-slate-600">{status}</span>
      </div>

      <section className="mb-4 rounded-md border border-slate-200 bg-white p-4 shadow-soft">
        <div className="grid gap-3 lg:grid-cols-[1fr_1fr]">
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Tiêu đề</span>
            <input
              value={manualTitle}
              onChange={(event) => setManualTitle(event.target.value)}
              className="mt-1 min-h-11 w-full rounded-md border border-slate-200 px-3 text-sm focus-ring"
              placeholder="Tên chiến dịch hoặc sản phẩm"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">SKU liên quan</span>
            <input
              value={manualSku}
              onChange={(event) => setManualSku(event.target.value)}
              className="mt-1 min-h-11 w-full rounded-md border border-slate-200 px-3 text-sm focus-ring"
              placeholder="Không bắt buộc"
            />
          </label>
        </div>
        <label className="mt-3 block">
          <span className="text-sm font-medium text-slate-700">Caption thủ công</span>
          <textarea
            value={manualCaption}
            onChange={(event) => setManualCaption(event.target.value)}
            className="mt-1 min-h-28 w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus-ring"
            placeholder="Nhập nội dung bài đăng"
          />
        </label>
        <div className="mt-3 grid gap-3 lg:grid-cols-3">
          <label className="block">
            <span className="text-sm font-medium text-slate-700">CTA</span>
            <select
              value={manualCta}
              onChange={(event) => setManualCta(event.target.value)}
              className="mt-1 min-h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-sm focus-ring"
            >
              <option>Nhắn tin</option>
              <option>Bình luận</option>
              <option>Mua ngay</option>
              <option>Xem thêm</option>
            </select>
          </label>
          <label className="block lg:col-span-2">
            <span className="text-sm font-medium text-slate-700">Ảnh/video</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime"
              onChange={(event) => setMediaFile(event.target.files?.[0] ?? null)}
              className="mt-1 min-h-11 w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus-ring"
            />
          </label>
        </div>
        <div className="mt-3 grid gap-2 md:grid-cols-3">
          {pages.map((page) => (
            <label key={page.id} className="flex min-h-11 items-center gap-2 rounded-md border border-slate-200 px-3 text-sm">
              <input
                type="checkbox"
                checked={selectedPageIds.includes(page.id)}
                onChange={(event) =>
                  setSelectedPageIds((current) =>
                    event.target.checked ? [...new Set([...current, page.id])] : current.filter((id) => id !== page.id)
                  )
                }
              />
              <span className="min-w-0 truncate">{page.name}</span>
            </label>
          ))}
        </div>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={() => void saveManualDraft(false)}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-slate-200 px-4 text-sm font-semibold text-slate-700 focus-ring"
          >
            <Upload className="h-4 w-4" aria-hidden="true" />
            Lưu nháp
          </button>
          <button
            type="button"
            onClick={() => void saveManualDraft(true)}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-brand-600 px-4 text-sm font-semibold text-white focus-ring"
          >
            <Send className="h-4 w-4" aria-hidden="true" />
            Tạo job đăng nhiều Page
          </button>
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-md border border-slate-200 bg-white shadow-soft">
          <div className="border-b border-slate-200 px-4 py-3">
            <h2 className="text-sm font-semibold text-ink">Ý tưởng mới</h2>
          </div>
          <div className="grid gap-3 p-4 md:grid-cols-2">
            {ideas.map((idea) => (
              <article key={idea.id} className="rounded-md border border-slate-200 p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusPill tone="info">{idea.template}</StatusPill>
                  <StatusPill tone={idea.aiMode === "ai" ? "success" : "warning"}>{idea.aiMode === "ai" ? "AI" : "Fallback"}</StatusPill>
                  <span className="text-xs text-slate-500">{idea.productSku}</span>
                </div>
                <h3 className="mt-2 text-sm font-semibold text-ink">{idea.title}</h3>
                <p className="mt-2 line-clamp-4 text-sm text-slate-600">{idea.caption}</p>
                <button
                  type="button"
                  onClick={() => void saveDraft(idea)}
                  className="mt-3 inline-flex h-10 w-10 items-center justify-center rounded-md border border-brand-200 text-brand-700 focus-ring"
                  aria-label="Lưu nháp"
                  title="Lưu nháp"
                >
                  <FilePlus2 className="h-4 w-4" aria-hidden="true" />
                </button>
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-md border border-slate-200 bg-white shadow-soft">
          <div className="border-b border-slate-200 px-4 py-3">
            <h2 className="text-sm font-semibold text-ink">Lịch gợi ý 7 ngày</h2>
          </div>
          <div className="divide-y divide-slate-100">
            {suggestions.map((item) => (
              <div key={`${item.date}-${item.suggestedTemplate}`} className="p-4">
                <div className="text-sm font-semibold text-ink">{new Date(item.date).toLocaleDateString("vi-VN")}</div>
                <div className="mt-1 text-sm text-slate-600">{item.theme}</div>
                <div className="mt-2"><StatusPill tone="neutral">{item.suggestedTemplate}</StatusPill></div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="mt-4 rounded-md border border-slate-200 bg-white shadow-soft">
        <div className="border-b border-slate-200 px-4 py-3">
          <h2 className="text-sm font-semibold text-ink">Bài nháp và bài đã lên lịch</h2>
        </div>
        <div className="divide-y divide-slate-100">
          {posts.map((post) => (
            <article key={post.id} className="grid gap-3 p-4 md:grid-cols-[1fr_auto] md:items-center">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-sm font-semibold text-ink">{post.title}</h3>
                  <StatusPill tone={post.status === "scheduled" ? "success" : "neutral"}>{post.status}</StatusPill>
                </div>
                <p className="mt-2 line-clamp-2 text-sm text-slate-600">{post.caption}</p>
                <p className="mt-1 text-xs text-slate-500">{post.scheduledAt || "Chưa lên lịch"}</p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => void schedulePost(post)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-emerald-200 text-emerald-700 focus-ring"
                  aria-label="Lên lịch ngày mai"
                  title="Lên lịch ngày mai"
                >
                  <CalendarPlus className="h-4 w-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => void publishPost(post)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-brand-200 text-brand-700 focus-ring"
                  aria-label="Tạo job đăng"
                  title="Tạo job đăng"
                >
                  <Send className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
