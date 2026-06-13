"use client";

import { FilePlus2, RefreshCcw, WandSparkles } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { ProductWithInventory } from "@/lib/ecommerce/types";
import { StatusPill } from "@/components/ui/status-pill";
import { ContentPlannerAiImagePicker, type PlannerAiAsset } from "./content-planner-ai-image-picker";
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

function PlannerMetric({ label, value }: { label: string; value: string | number }) {
  return (
    <article className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3">
      <div className="text-2xl font-bold text-stone-950">{value}</div>
      <div className="text-xs font-semibold uppercase tracking-[0.12em] text-stone-500">{label}</div>
    </article>
  );
}

export function ContentPlannerContent() {
  const searchParams = useSearchParams();
  const [ideas, setIdeas] = useState<ContentIdea[]>([]);
  const [posts, setPosts] = useState<ContentPost[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [pages, setPages] = useState<FacebookPage[]>([]);
  const [selectedPageIds, setSelectedPageIds] = useState<string[]>([]);
  const [manualTitle, setManualTitle] = useState("");
  const [manualCaption, setManualCaption] = useState("");
  const [manualCta, setManualCta] = useState("Nhắn tin");
  const [selectedProductSku, setSelectedProductSku] = useState("");
  const [selectedProductName, setSelectedProductName] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreviewUrl, setMediaPreviewUrl] = useState("");
  const [selectedAiAsset, setSelectedAiAsset] = useState<PlannerAiAsset | null>(null);
  const [editing, setEditing] = useState<EditPostDraft | null>(null);
  const [scheduleDraft, setScheduleDraft] = useState<SchedulePostDraft | null>(null);
  const [deleteCandidate, setDeleteCandidate] = useState<ContentPost | null>(null);
  const [publishJobs, setPublishJobs] = useState<PublishJobPreview[]>([]);
  const [publishSettings, setPublishSettings] = useState<PublishSettings>({ autoPublishEnabled: false });
  const [status, setStatus] = useState("Đang tải planner...");

  async function loadPlanner(nextStatus = "Planner sẵn sàng: chọn sản phẩm, ảnh AI, caption và lịch đăng trên cùng một màn.") {
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
      const nextPages = pagesPayload.data.pages ?? [];
      setPages(nextPages);
      setSelectedPageIds((current) => (current.length ? current : defaultPageSelection(nextPages)));
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
          ? `Đã tạo ${payload.data.ideas.length} gợi ý AI theo dữ liệu sản phẩm thật.`
          : payload.data.notice || `Đã tạo ${payload.data.ideas.length} gợi ý mẫu an toàn.`
      );
    } else {
      setStatus(payload.error || "Tạo gợi ý lỗi.");
    }
  }

  function resetManualForm() {
    setManualTitle("");
    setManualCaption("");
    setSelectedProductSku("");
    setSelectedProductName("");
    setMediaFile(null);
    setMediaPreviewUrl("");
    setSelectedAiAsset(null);
  }

  async function uploadManualMedia(postId: string) {
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

  async function uploadSelectedAiAsset(postId: string) {
    if (!selectedAiAsset?.publicUrl || mediaFile) return true;
    const source = await fetch(selectedAiAsset.publicUrl, { cache: "no-store" });
    if (!source.ok) {
      setStatus("Không tải được ảnh AI đã duyệt để gắn vào bài.");
      return false;
    }
    const blob = await source.blob();
    const file = new File([blob], selectedAiAsset.fileName || `imageflow-${selectedAiAsset.id}.jpg`, {
      type: blob.type || selectedAiAsset.mimeType || "image/jpeg"
    });
    const form = new FormData();
    form.set("file", file);
    const response = await fetch(`/api/content/posts/${encodeURIComponent(postId)}/media`, { method: "POST", body: form });
    const payload = (await response.json().catch(() => null)) as PlannerEnvelope | null;
    if (!response.ok || !payload?.success) {
      setStatus(payload?.error || "Gắn ảnh AI vào bài đăng không thành công.");
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
      mediaSuggestion: selectedAiAsset ? `Ảnh AI đã duyệt: ${selectedAiAsset.fileName}` : ""
    };

    if (!source.productSku) return void setStatus("Cần chọn sản phẩm thật đã sync trước khi lưu bài.");
    if (mode === "schedule" && !scheduledAt) return void setStatus("Cần chọn ngày giờ cụ thể trước khi lên lịch.");
    if (!source.title.trim() || !source.caption.trim()) return void setStatus("Cần nhập tiêu đề và caption trước khi lưu.");
    if (pageIds.length === 0) return void setStatus("Chưa có Fanpage để tạo target bài đăng.");

    const autoCreateImageflow = !mediaFile && !selectedAiAsset;
    const response = await fetch("/api/content/posts", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...source, pageId: pageIds[0], pageIds, status: "draft", autoCreateImageflow })
    });
    const payload = (await response.json()) as {
      success: boolean;
      data?: { post: ContentPost; imageflowJob?: { id: string; status: string } | null; imageflowError?: string | null };
      error?: string;
    };
    if (!payload.success || !payload.data) return void setStatus(payload.error || "Lưu bài lỗi.");

    if (!(await uploadManualMedia(payload.data.post.id))) return;
    if (!(await uploadSelectedAiAsset(payload.data.post.id))) return;

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
    if (payload.data.imageflowError || payload.data.imageflowJob) {
      await loadPlanner(
        payload.data.imageflowError
          ? `Đã lưu bài, nhưng chưa xếp tạo ảnh được: ${payload.data.imageflowError}`
          : "Đã lưu bài và xếp tạo ảnh tự động."
      );
      return;
    }
    await loadPlanner("Đã lưu bài nháp.");
  }

  async function schedulePost(post: ContentPost, localValue = scheduledAt, pageIds = selectedPageIds) {
    if (!localValue) return void setStatus("Cần chọn ngày giờ cụ thể trước khi lên lịch.");
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
      if (!confirmed) return void setStatus("Đã huỷ publish thật trước khi gọi Facebook API.");
    }
    const response = await fetch(`/api/content/posts/${encodeURIComponent(post.id)}/publish`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ pageIds: targetPageIds, publishNow: true, waitForMedia: true })
    });
    const payload = (await response.json()) as { success: boolean; data?: { jobs: PublishJobPreview[] }; error?: string };
    if (payload.success && payload.data) {
      setPublishJobs(payload.data.jobs);
      const dryRun = payload.data.jobs.every((job) => job.dryRun);
      const waitingMedia = payload.data.jobs.some((job) => job.error === "WAITING_IMAGEFLOW_ASSETS");
      if (waitingMedia) {
        await loadPlanner("Đã xếp publish job chờ ảnh hoàn tất, không đăng bài chữ.");
        return;
      }
      await loadPlanner(dryRun ? "Đã tạo publish job dry-run vì AUTO_PUBLISH_POSTS_ENABLED=false." : "Đã gửi publish job thật.");
    } else {
      await loadPlanner(payload.error || "Tạo publish job lỗi.");
    }
  }

  async function saveEdit() {
    if (!editing) return;
    if (!editing.productSku) return void setStatus("Cần chọn sản phẩm thật đã sync khi chỉnh sửa bài.");
    if (editing.pageIds.length === 0) return void setStatus("Cần chọn ít nhất một Fanpage khi chỉnh sửa bài.");

    const response = await fetch(`/api/content/posts/${encodeURIComponent(editing.id)}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title: editing.title,
        caption: editing.caption,
        cta: editing.cta,
        productSku: editing.productSku,
        pageIds: editing.pageIds,
        scheduledAt: editing.scheduledAt ? toIsoFromLocal(editing.scheduledAt) : null
      })
    });
    const payload = (await response.json()) as { success: boolean; error?: string };
    if (payload.success) {
      setEditing(null);
      await loadPlanner("Đã cập nhật bài.");
    } else {
      setStatus(payload.error || "Cập nhật bài lỗi.");
    }
  }

  async function deletePost(post: ContentPost) {
    const response = await fetch(`/api/content/posts/${encodeURIComponent(post.id)}`, { method: "DELETE" });
    const payload = (await response.json()) as { success: boolean; error?: string };
    setDeleteCandidate(null);
    await loadPlanner(payload.success ? "Đã xoá bài khỏi planner." : payload.error || "Xoá bài lỗi.");
  }

  function updateMedia(file: File | null) {
    if (mediaPreviewUrl) URL.revokeObjectURL(mediaPreviewUrl);
    setSelectedAiAsset(null);
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

  useEffect(() => {
    const fromUrl = searchParams.get("sku");
    if (fromUrl && fromUrl !== selectedProductSku) setSelectedProductSku(fromUrl);
  }, [searchParams, selectedProductSku]);

  const draftCount = posts.filter((post) => post.status === "draft").length;
  const scheduledCount = posts.filter((post) => post.status === "scheduled").length;
  const publishedCount = posts.filter((post) => post.status === "published").length;

  const plannerSteps = useMemo(
    () => [
      { label: "Sản phẩm", active: Boolean(selectedProductSku) },
      { label: "Ảnh AI", active: Boolean(selectedAiAsset || mediaPreviewUrl) },
      { label: "Caption", active: Boolean(manualTitle.trim() || manualCaption.trim()) },
      { label: "Lịch đăng", active: Boolean(scheduledAt || selectedPageIds.length > 0) }
    ],
    [manualCaption, manualTitle, mediaPreviewUrl, scheduledAt, selectedAiAsset, selectedPageIds.length, selectedProductSku]
  );

  return (
    <div className="space-y-4">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-[28px] font-bold tracking-normal text-slate-950">Lịch nội dung</h1>
          <p className="mt-1 text-sm text-slate-600">Gộp sản phẩm, ảnh AI, caption và lịch đăng vào một workspace thao tác nhanh hơn.</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void loadPlanner()}
            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-stone-200 bg-white text-stone-700"
            aria-label="Tải lại"
            title="Tải lại"
          >
            <RefreshCcw className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => void generateIdeas()}
            className="inline-flex min-h-10 items-center gap-2 rounded-2xl bg-[#6f8fe8] px-4 text-sm font-semibold text-white"
          >
            <WandSparkles className="h-4 w-4" aria-hidden="true" />
            Gợi ý
          </button>
        </div>
      </div>

      <section className="rounded-[30px] border border-stone-200 bg-[#f7f2e8] p-3 shadow-[0_30px_80px_rgba(15,23,42,0.06)] md:p-4">
        <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
          <span className="inline-flex gap-1">
            <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
          </span>
          FBSHV CRM
        </div>

        <div className="space-y-3">
          <div className="rounded-[24px] border border-stone-200 bg-white p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="text-lg font-bold text-stone-950">Lịch nội dung</div>
                <div className="mt-1 text-sm text-stone-500">{status}</div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <StatusPill tone="info">Flow một màn: sản phẩm → ảnh → caption → lịch</StatusPill>
                <StatusPill tone={publishSettings.autoPublishEnabled ? "danger" : "warning"}>
                  {publishSettings.autoPublishEnabled ? "Đăng thật đang bật" : "Nháp an toàn"}
                </StatusPill>
              </div>
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-3 xl:grid-cols-4">
              <PlannerMetric label="Bài nháp" value={draftCount} />
              <PlannerMetric label="Đã lên lịch" value={scheduledCount} />
              <PlannerMetric label="Đã đăng" value={publishedCount} />
              <PlannerMetric label="Page chọn" value={selectedPageIds.length || 0} />
            </div>

            <div className="mt-4 grid gap-2 md:grid-cols-4">
              {plannerSteps.map((step, index) => (
                <article
                  key={step.label}
                  className={`rounded-2xl border px-4 py-3 text-sm font-semibold ${
                    step.active ? "border-blue-200 bg-blue-50 text-blue-700" : "border-stone-200 bg-stone-50 text-stone-500"
                  }`}
                >
                  <span className="mr-2 text-stone-400">{index + 1}</span>
                  {step.label}
                </article>
              ))}
            </div>
          </div>

          <div className="grid gap-3 xl:grid-cols-[1.28fr_0.72fr]">
            <ContentPlannerEditor
              pages={pages}
              selectedPageIds={selectedPageIds}
              selectedProductSku={selectedProductSku}
              selectedProductName={selectedProductName}
              mediaFile={mediaFile}
              mediaPreviewUrl={mediaPreviewUrl || selectedAiAsset?.publicUrl || ""}
              mediaSourceLabel={selectedAiAsset ? `Ảnh AI đã duyệt - ${selectedAiAsset.fileName}` : mediaFile?.name}
              manualTitle={manualTitle}
              manualCaption={manualCaption}
              manualCta={manualCta}
              scheduledAt={scheduledAt}
              aiImagePicker={
                <ContentPlannerAiImagePicker
                  initialAssetId={searchParams.get("imageflowAssetId")}
                  productSku={selectedProductSku}
                  productName={selectedProductName}
                  selectedAssetId={selectedAiAsset?.id}
                  onSelectAsset={(asset) => {
                    if (mediaPreviewUrl) URL.revokeObjectURL(mediaPreviewUrl);
                    setMediaFile(null);
                    setMediaPreviewUrl("");
                    setSelectedAiAsset(asset);
                  }}
                />
              }
              onTitleChange={setManualTitle}
              onCaptionChange={setManualCaption}
              onCtaChange={setManualCta}
              onScheduledAtChange={setScheduledAt}
              onProductSelect={(product: ProductWithInventory | null) => {
                setSelectedProductSku(product?.sku ?? "");
                setSelectedProductName(product?.name ?? "");
                setSelectedAiAsset(null);
              }}
              onPageToggle={(pageId, checked) =>
                setSelectedPageIds((current) => (checked ? [...new Set([...current, pageId])] : current.filter((id) => id !== pageId)))
              }
              onMediaChange={updateMedia}
              onSave={(mode) => void createPost(mode)}
            />

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

          <div className="grid gap-3 xl:grid-cols-2">
            <section className="rounded-[24px] border border-stone-200 bg-white p-4">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-semibold text-stone-900">Gợi ý lịch & chủ đề</h2>
                <StatusPill tone="neutral">{suggestions.length}</StatusPill>
              </div>
              <div className="mt-3 grid gap-2 md:grid-cols-2">
                {suggestions.slice(0, 4).map((item) => (
                  <div key={`${item.date}-${item.suggestedTemplate}`} className="rounded-2xl border border-stone-200 bg-stone-50 p-3">
                    <div className="text-sm font-semibold text-stone-900">{new Date(item.date).toLocaleDateString("vi-VN")}</div>
                    <div className="mt-1 text-sm text-stone-600">{item.theme}</div>
                    <div className="mt-2">
                      <StatusPill tone="neutral">{item.suggestedTemplate}</StatusPill>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-[24px] border border-stone-200 bg-white p-4">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-semibold text-stone-900">Gợi ý nội dung mới</h2>
                <StatusPill tone="info">{ideas.length}</StatusPill>
              </div>
              <div className="mt-3 grid gap-2">
                {ideas.slice(0, 2).map((idea) => (
                  <article key={idea.id} className="rounded-2xl border border-stone-200 bg-stone-50 p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusPill tone="info">{idea.template}</StatusPill>
                      <StatusPill tone={idea.aiMode === "ai" ? "success" : "warning"}>
                        {idea.aiMode === "ai" ? "AI thật" : "Mẫu an toàn"}
                      </StatusPill>
                    </div>
                    <h3 className="mt-2 text-sm font-semibold text-stone-900">{idea.title}</h3>
                    <p className="mt-1 line-clamp-3 text-sm text-stone-600">{idea.caption}</p>
                    <button
                      type="button"
                      onClick={() => void createPost("draft", idea)}
                      className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-2xl border border-blue-200 bg-white px-3 text-sm font-semibold text-blue-700"
                    >
                      <FilePlus2 className="h-4 w-4" aria-hidden="true" />
                      Lưu thành nháp
                    </button>
                  </article>
                ))}
              </div>
            </section>
          </div>
        </div>
      </section>
    </div>
  );
}
