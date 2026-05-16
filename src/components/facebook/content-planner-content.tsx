"use client";

import { CalendarPlus, FilePlus2, RefreshCcw, WandSparkles } from "lucide-react";
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
};

type ContentPost = ContentIdea & {
  status: "draft" | "scheduled" | "published" | "failed" | "cancelled";
  scheduledAt?: string | null;
  updatedAt: string;
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
  const [status, setStatus] = useState("Đang tải planner...");

  async function loadPlanner() {
    const [postsResponse, calendarResponse] = await Promise.all([
      fetch("/api/content/posts", { cache: "no-store" }),
      fetch("/api/content/calendar/suggestions?days=7", { cache: "no-store" })
    ]);
    const postsPayload = (await postsResponse.json()) as { success: boolean; data?: { posts: ContentPost[] } };
    const calendarPayload = (await calendarResponse.json()) as { success: boolean; data?: { suggestions: Suggestion[] } };
    if (postsPayload.success && postsPayload.data) setPosts(postsPayload.data.posts);
    if (calendarPayload.success && calendarPayload.data) setSuggestions(calendarPayload.data.suggestions);
    setStatus("Planner sẵn sàng ở chế độ nháp/lên lịch.");
  }

  async function generateIdeas() {
    const response = await fetch("/api/content/posts/generate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ limit: 7 })
    });
    const payload = (await response.json()) as { success: boolean; data?: { ideas: ContentIdea[] }; error?: string };
    if (payload.success && payload.data) {
      setIdeas(payload.data.ideas);
      setStatus(`Đã tạo ${payload.data.ideas.length} ý tưởng từ sản phẩm TMĐT.`);
    } else {
      setStatus(payload.error || "Tạo ý tưởng lỗi.");
    }
  }

  async function saveDraft(idea: ContentIdea) {
    const response = await fetch("/api/content/posts", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...idea, status: "draft" })
    });
    const payload = (await response.json()) as { success: boolean; error?: string };
    setStatus(payload.success ? "Đã lưu bài nháp." : payload.error || "Lưu bài lỗi.");
    await loadPlanner();
  }

  async function schedulePost(post: ContentPost) {
    const date = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const response = await fetch(`/api/content/posts/${encodeURIComponent(post.id)}/schedule`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ scheduledAt: date })
    });
    const payload = (await response.json()) as { success: boolean; error?: string };
    setStatus(payload.success ? "Đã lên lịch bài viết." : payload.error || "Lên lịch lỗi.");
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
              <button
                type="button"
                onClick={() => void schedulePost(post)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-emerald-200 text-emerald-700 focus-ring"
                aria-label="Lên lịch ngày mai"
                title="Lên lịch ngày mai"
              >
                <CalendarPlus className="h-4 w-4" aria-hidden="true" />
              </button>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
