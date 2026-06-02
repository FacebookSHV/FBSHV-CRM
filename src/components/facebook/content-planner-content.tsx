"use client";

import { FilePlus2, RefreshCcw, WandSparkles } from "lucide-react";
import { useEffect, useState } from "react";
import type { ProductWithInventory } from "@/lib/ecommerce/types";
import { PageHeader } from "@/components/pages/page-header";
import { StatusPill } from "@/components/ui/status-pill";
import { ContentPlannerEditor } from "./content-planner-editor";
import { ContentPlannerPostList } from "./content-planner-post-list";
import type {
  ContentIdea,
  ContentPost,
  EditPostDraft,
  FacebookPage,
  PublishJobPreview,
  PublishSettings,
  SchedulePostDraft,
  Suggestion
} from "./content-planner-types";

type PlannerEnvelope = { success: boolean; data?: unknown; error?: string };

function toIsoFromLocal(value: string) {
  return value ? new Date(value).toISOString() : "";
}

function localFromIso(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function defaultPageSelection(pages: FacebookPage[]) {
  return pages.slice(0, 2).map((page) => page.id);
}

export function ContentPlannerContent() {
  const [ideas, setIdeas] = useState<ContentIdea[]>([]);
  const [posts, setPosts] = useState<ContentPost[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [pages, setPages] = useState<FacebookPage[]>([]);
  const [selectedPageIds, setSelectedPageIds] = useState<string[]>([]);
  const [manualTitle, setManualTitle] = useState("");
  const [manualCaption, setManualCaption] = useState("");
  const [manualCta, setManualCta] = useState("Nhắn tin");
  const [selectedProductSku, setSelectedProductSku] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreviewUrl, setMediaPreviewUrl] = useState("");
  const [editing, setEditing] = useState<EditPostDraft | null>(null);
  const [scheduleDraft, setScheduleDraft] = useState<SchedulePostDraft | null>(null);
  const [deleteCandidate, setDeleteCandidate] = useState<ContentPost | null>(null);
  const [publishJobs, setPublishJobs] = useState<PublishJobPreview[]>([]);
  const [publishSettings, setPublishSettings] = useState<PublishSettings>({ autoPublishEnabled: false });
  const [status, setStatus] = useState("Đang tải planner...");

  async function loadPlanner(nextStatus = "Planner sẵn sàng: draft, scheduled, upload R2 và publish job theo từng Page.") {
    const [postsResponse, calendarResponse, pagesResponse] = await Promise.all([
      fetch("/api/content/posts", { cache: "no-store" }),
      fetch("/api/content/calendar/suggestions?days=7", { cache: "no-store" }),
      fetch("/api/facebook/pages", { cache: "no-store" })
    ]);
    const postsPayload = (await postsResponse.json()) as { success: boolean; data?: { posts: ContentPost[]; publishSettings?: PublishSettings } };
    const calendarPayload = (await calendarResponse.json()) as { success: boolean; data?: { suggestions: Suggestion[] } };
    const pagesPayload = (await pagesResponse.json()) as { success: boolean; data?: { pages: FacebookPage[] } };
    if (postsPayload.success && postsPayload.data) {
      setPosts(postsPayload.data.posts);
      if (postsPayload.data.publishSettings) setPublishSettings(postsPayload.data.publishSettings);
    }
    if (calendarPayload.success && calendarPayload.data) setSuggestions(calendarPayload.data.suggestions);
    if (pagesPayload.success && pagesPayload.data) {
      setPages(pagesPayload.data.pages);
      setSelectedPageIds((current) => (current.length ? current : defaultPageSelection(pagesPayload.data?.pages ?? [])));
    }
    setStatus(nextStatus);
  }

  async function generateIdeas() {
    const response = await fetch("/api/content/posts/generate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ limit: 7, pageIds: selectedPageIds })
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
          ? `Đã tạo ${payload.data.ideas.length} ý tưởng bằng AI thật từ sản phẩm đã sync.`
          : payload.data.notice || `Đã tạo ${payload.data.ideas.length} ý tưởng bằng template an toàn.`
      );
    } else {
      setStatus(payload.error || "Tạo ý tưởng lỗi.");
    }
  }

  function resetManualForm() {
    setManualTitle("");
    setManualCaption("");
    setSelectedProductSku("");
    setMediaFile(null);
    setMediaPreviewUrl("");
  }

  async function uploadMedia(postId: string) {
    if (!mediaFile) return true;
    const form = new FormData();
    form.set("file", mediaFile);
    const response = await fetch(`/api/content/posts/${encodeURIComponent(postId)}/media`, { method: "POST", body: form });
    const payload = (await response.json().catch(() => null)) as PlannerEnvelope | null;
    if (!response.ok || !payload?.success) {
      setStatus(payload?.error || "Upload media lên R2 lỗi.");
      return false;
    }
    return true;
  }

  async function createPost(mode: "draft" | "schedule" | "publish", idea?: ContentIdea) {
    const pageIds = selectedPageIds.length ? selectedPageIds : defaultPageSelection(pages).slice(0, 1);
    const source = idea ?? {
      title: manualTitle,
      caption: manualCaption,
      cta: manualCta,
      productSku: selectedProductSku || null,
      template: "product_intro",
      mediaSuggestion: ""
    };
    if (!source.productSku) {
      setStatus("Cần chọn sản phẩm thật đã sync trước khi lưu bài.");
      return;
    }
    if (mode === "schedule" && !scheduledAt) {
      setStatus("Cần chọn ngày giờ cụ thể trước khi lên lịch.");
      return;
    }
    if (!source.title.trim() || !source.caption.trim()) {
      setStatus("Cần nhập tiêu đề và caption trước khi lưu.");
      return;
    }
    if (pageIds.length === 0) {
      setStatus("Chưa có Fanpage để tạo target bài đăng.");
      return;
    }
    const response = await fetch("/api/content/posts", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...source, pageId: pageIds[0], pageIds, status: "draft" })
    });
    const payload = (await response.json()) as { success: boolean; data?: { post: ContentPost }; error?: string };
    if (!payload.success || !payload.data) {
      setStatus(payload.error || "Lưu bài lỗi.");
      return;
    }
    if (!(await uploadMedia(payload.data.post.id))) return;
    if (mode === "schedule") {
      await schedulePost(payload.data.post, scheduledAt, pageIds);
      if (!idea) resetManualForm();
      return;
    }
    if (mode === "publish") {
      await publishPost(payload.data.post, pageIds);
      if (!idea) resetManualForm();
      return;
    }
    if (!idea) resetManualForm();
    await loadPlanner("Đã lưu bài nháp.");
  }

  async function schedulePost(post: ContentPost, localValue = scheduledAt, pageIds = selectedPageIds) {
    if (!localValue) {
      setStatus("Cần chọn ngày giờ cụ thể trước khi lên lịch.");
      return;
    }
    const targetPageIds = pageIds.length ? pageIds : [post.pageId];
    const response = await fetch(`/api/content/posts/${encodeURIComponent(post.id)}/schedule`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ scheduledAt: toIsoFromLocal(localValue), pageIds: targetPageIds })
    });
    const payload = (await response.json()) as { success: boolean; error?: string };
    setScheduleDraft(null);
    await loadPlanner(payload.success ? "Đã lên lịch và tạo job riêng từng Fanpage." : payload.error || "Lên lịch lỗi.");
  }

  async function publishPost(post: ContentPost, pageIds = selectedPageIds) {
    const targetPageIds = pageIds.length ? pageIds : [post.pageId];
    if (publishSettings.autoPublishEnabled) {
      const confirmed = window.confirm("AUTO_PUBLISH_POSTS_ENABLED=true: thao tác này sẽ đăng thật lên Facebook. Tiếp tục?");
      if (!confirmed) {
        setStatus("Đã huỷ publish thật trước khi gọi Facebook API.");
        return;
      }
    }
    const response = await fetch(`/api/content/posts/${encodeURIComponent(post.id)}/publish`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ pageIds: targetPageIds, publishNow: true })
    });
    const payload = (await response.json()) as {
      success: boolean;
      data?: { jobs: PublishJobPreview[] };
      error?: string;
    };
    if (payload.success && payload.data) {
      setPublishJobs(payload.data.jobs);
      const dryRun = payload.data.jobs.every((job) => job.dryRun);
      await loadPlanner(dryRun ? "Đã tạo publish job dry-run vì AUTO_PUBLISH_POSTS_ENABLED=false." : "Đã gửi publish job thật.");
    } else {
      await loadPlanner(payload.error || "Tạo publish job lỗi.");
    }
  }

  async function saveEdit() {
    if (!editing) return;
    if (!editing.productSku) {
      setStatus("Cần chọn sản phẩm thật đã sync khi chỉnh sửa bài.");
      return;
    }
    if (editing.pageIds.length === 0) {
      setStatus("Cần chọn ít nhất một Fanpage khi chỉnh sửa bài.");
      return;
    }
    const response = await fetch(`/api/content/posts/${encodeURIComponent(editing.id)}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title: editing.title,
        caption: editing.caption,
        cta: editing.cta,
        productSku: editing.productSku,
        pageId: editing.pageIds[0],
        pageIds: editing.pageIds,
        scheduledAt: editing.scheduledAt ? toIsoFromLocal(editing.scheduledAt) : null
      })
    });
    const payload = (await response.json()) as { success: boolean; error?: string };
    setEditing(null);
    await loadPlanner(payload.success ? "Đã lưu chỉnh sửa bài vào D1." : payload.error || "Lưu chỉnh sửa lỗi.");
  }

  async function deletePost(post: ContentPost) {
    const response = await fetch(`/api/content/posts/${encodeURIComponent(post.id)}`, { method: "DELETE" });
    const payload = (await response.json()) as { success: boolean; error?: string };
    setDeleteCandidate(null);
    await loadPlanner(payload.success ? "Đã xóa bài draft/scheduled khỏi D1." : payload.error || "Xóa bài lỗi.");
  }

  function updateMedia(file: File | null) {
    if (mediaPreviewUrl) URL.revokeObjectURL(mediaPreviewUrl);
    setMediaFile(file);
    setMediaPreviewUrl(file ? URL.createObjectURL(file) : "");
  }

  function startEdit(post: ContentPost) {
    const pageIds = selectedPageIds.length ? selectedPageIds : [post.pageId];
    setEditing({
      id: post.id,
      title: post.title,
      caption: post.caption,
      cta: post.cta,
      productSku: post.productSku ?? "",
      pageIds,
      scheduledAt: localFromIso(post.scheduledAt) || scheduledAt
    });
  }

  useEffect(() => {
    void loadPlanner();
    return () => {
      if (mediaPreviewUrl) URL.revokeObjectURL(mediaPreviewUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const draftCount = posts.filter((post) => post.status === "draft").length;
  const scheduledCount = posts.filter((post) => post.status === "scheduled").length;
  const publishedCount = posts.filter((post) => post.status === "published").length;

  return (
    <div>
      <PageHeader
        title="Lịch đăng bài"
        subtitle="Soạn nội dung bán hàng, chọn sản phẩm thật, lên lịch theo Fanpage và kiểm tra trạng thái đăng bài."
        action={
          <div className="flex gap-2">
            <button type="button" onClick={() => void loadPlanner()} className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-700 focus-ring" aria-label="Tải lại" title="Tải lại">
              <RefreshCcw className="h-4 w-4" aria-hidden="true" />
            </button>
            <button type="button" onClick={() => void generateIdeas()} className="inline-flex min-h-10 items-center gap-2 rounded-md bg-brand-600 px-3 text-sm font-semibold text-white focus-ring">
              <WandSparkles className="h-4 w-4" aria-hidden="true" />
              Gợi ý nội dung
            </button>
          </div>
        }
      />

      <section className="mb-4 grid gap-3 md:grid-cols-4">
        <article className="rounded-md border border-slate-200 bg-white p-4 shadow-soft">
          <div className="text-2xl font-semibold tabular-nums text-ink">{draftCount}</div>
          <div className="text-sm text-slate-600">bài nháp</div>
        </article>
        <article className="rounded-md border border-slate-200 bg-white p-4 shadow-soft">
          <div className="text-2xl font-semibold tabular-nums text-ink">{scheduledCount}</div>
          <div className="text-sm text-slate-600">bài đã lên lịch</div>
        </article>
        <article className="rounded-md border border-slate-200 bg-white p-4 shadow-soft">
          <div className="text-2xl font-semibold tabular-nums text-ink">{publishedCount}</div>
          <div className="text-sm text-slate-600">bài đã đăng</div>
        </article>
        <article className="rounded-md border border-slate-200 bg-white p-4 shadow-soft">
          <div className="text-2xl font-semibold tabular-nums text-ink">{selectedPageIds.length}</div>
          <div className="text-sm text-slate-600">Fanpage đang chọn</div>
        </article>
      </section>

      <div className="mb-4 flex flex-wrap items-center gap-2 rounded-md border border-slate-200 bg-white p-3 shadow-soft">
        <StatusPill tone="info">Lệnh đăng theo Fanpage</StatusPill>
        <StatusPill tone={publishSettings.autoPublishEnabled ? "danger" : "warning"}>
          {publishSettings.autoPublishEnabled ? "Đăng thật đang bật" : "Chạy thử khi chưa bật đăng thật"}
        </StatusPill>
        <span className="text-sm text-slate-600">{status}</span>
      </div>

      <ContentPlannerEditor
        pages={pages}
        selectedPageIds={selectedPageIds}
        selectedProductSku={selectedProductSku}
        mediaFile={mediaFile}
        mediaPreviewUrl={mediaPreviewUrl}
        manualTitle={manualTitle}
        manualCaption={manualCaption}
        manualCta={manualCta}
        scheduledAt={scheduledAt}
        onTitleChange={setManualTitle}
        onCaptionChange={setManualCaption}
        onCtaChange={setManualCta}
        onScheduledAtChange={setScheduledAt}
        onProductSelect={(product: ProductWithInventory | null) => setSelectedProductSku(product?.sku ?? "")}
        onPageToggle={(pageId, checked) => setSelectedPageIds((current) => (checked ? [...new Set([...current, pageId])] : current.filter((id) => id !== pageId)))}
        onMediaChange={updateMedia}
        onSave={(mode) => void createPost(mode)}
      />

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-md border border-slate-200 bg-white shadow-soft">
          <div className="border-b border-slate-200 px-4 py-3">
            <h2 className="text-sm font-semibold text-ink">Gợi ý nội dung mới</h2>
          </div>
          <div className="grid gap-3 p-4 md:grid-cols-2">
            {ideas.map((idea) => (
              <article key={idea.id} className="rounded-md border border-slate-200 p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusPill tone="info">{idea.template}</StatusPill>
                  <StatusPill tone={idea.aiMode === "ai" ? "success" : "warning"}>{idea.aiMode === "ai" ? "AI thật" : "Mẫu an toàn"}</StatusPill>
                  <span className="text-xs text-slate-500">{idea.productSku}</span>
                </div>
                <h3 className="mt-2 text-sm font-semibold text-ink">{idea.title}</h3>
                <p className="mt-2 line-clamp-4 text-sm text-slate-600">{idea.caption}</p>
                <button type="button" onClick={() => void createPost("draft", idea)} className="mt-3 inline-flex h-10 w-10 items-center justify-center rounded-md border border-brand-200 text-brand-700 focus-ring" aria-label="Lưu nháp" title="Lưu nháp">
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

      <ContentPlannerPostList
        posts={posts}
        pages={pages}
        selectedPageIds={selectedPageIds}
        publishJobs={publishJobs}
        editing={editing}
        scheduleDraft={scheduleDraft}
        deleteCandidate={deleteCandidate}
        onStartEdit={startEdit}
        onEditChange={(patch) => setEditing((current) => (current ? { ...current, ...patch } : current))}
        onEditPageToggle={(pageId, checked) =>
          setEditing((current) =>
            current
              ? { ...current, pageIds: checked ? [...new Set([...current.pageIds, pageId])] : current.pageIds.filter((id) => id !== pageId) }
              : current
          )
        }
        onCancelEdit={() => setEditing(null)}
        onSaveEdit={() => void saveEdit()}
        onOpenSchedule={(post) => setScheduleDraft({ id: post.id, title: post.title, scheduledAt: localFromIso(post.scheduledAt) || scheduledAt })}
        onScheduleChange={(value) => setScheduleDraft((current) => (current ? { ...current, scheduledAt: value } : current))}
        onCancelSchedule={() => setScheduleDraft(null)}
        onSaveSchedule={(post) => void schedulePost(post, scheduleDraft?.scheduledAt || scheduledAt)}
        onPublish={(post) => void publishPost(post)}
        onRequestDelete={setDeleteCandidate}
        onCancelDelete={() => setDeleteCandidate(null)}
        onConfirmDelete={(post) => void deletePost(post)}
      />
    </div>
  );
}
