"use client";

import { LoaderCircle, Pencil, Save, Trash2, X } from "lucide-react";
import type { ReactNode } from "react";
import type { ProductWithInventory } from "@/lib/ecommerce/types";
import { ProductSearchPicker } from "@/components/products/product-search-picker";
import { StatusPill } from "@/components/ui/status-pill";
import { GoldenHourButtons } from "./content-planner-editor";
import type {
  ContentPost,
  EditPostDraft,
  FacebookPage,
  PublishJobPreview,
  SchedulePostDraft
} from "./content-planner-types";

type ContentPlannerPostListProps = {
  posts: ContentPost[];
  pages: FacebookPage[];
  selectedPageIds: string[];
  publishJobs: PublishJobPreview[];
  editing: EditPostDraft | null;
  scheduleDraft: SchedulePostDraft | null;
  deleteCandidate: ContentPost | null;
  deletingPostId: string | null;
  deleteAllOpen: boolean;
  deleteAllConfirmed: boolean;
  deleteProgress: { completed: number; total: number } | null;
  onStartEdit: (post: ContentPost) => void;
  onEditChange: (patch: Partial<EditPostDraft>) => void;
  onEditPageToggle: (pageId: string, checked: boolean) => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
  onOpenSchedule: (post: ContentPost) => void;
  onScheduleChange: (value: string) => void;
  onCancelSchedule: () => void;
  onSaveSchedule: (post: ContentPost) => void;
  onPublish: (post: ContentPost) => void;
  onRequestDelete: (post: ContentPost) => void;
  onCancelDelete: () => void;
  onConfirmDelete: (post: ContentPost) => void;
  onRequestDeleteAll: () => void;
  onDeleteAllConfirmedChange: (checked: boolean) => void;
  onCancelDeleteAll: () => void;
  onConfirmDeleteAll: () => void;
};

function statusTone(status: ContentPost["status"]) {
  if (status === "scheduled" || status === "published") return "success" as const;
  if (status === "failed") return "danger" as const;
  if (status === "cancelled") return "warning" as const;
  return "neutral" as const;
}

function statusLabel(status: ContentPost["status"]) {
  if (status === "draft") return "Nháp";
  if (status === "scheduled") return "Lịch";
  if (status === "published") return "Đã đăng";
  if (status === "failed") return "Lỗi";
  if (status === "cancelled") return "Huỷ";
  return status;
}

function publishJobLabel(status: string, dryRun: boolean) {
  if (dryRun || status === "dry_run") return "Chạy thử";
  if (status === "published") return "Đã đăng";
  if (status === "failed") return "Lỗi";
  if (status === "pending") return "Đang chờ";
  return status;
}

function jobTone(status: string, dryRun: boolean) {
  if (dryRun || status === "dry_run") return "warning" as const;
  if (status === "published") return "success" as const;
  if (status === "failed") return "danger" as const;
  return "info" as const;
}

function formatSchedule(value?: string | null) {
  if (!value) return "Chưa lên lịch";
  return new Date(value).toLocaleString("vi-VN");
}

function PlannerListRow({
  post,
  selectedPageIds,
  deletingPostId,
  onStartEdit,
  onOpenSchedule,
  onPublish,
  onRequestDelete
}: {
  post: ContentPost;
  selectedPageIds: string[];
  deletingPostId: string | null;
  onStartEdit: (post: ContentPost) => void;
  onOpenSchedule: (post: ContentPost) => void;
  onPublish: (post: ContentPost) => void;
  onRequestDelete: (post: ContentPost) => void;
}) {
  const deleting = deletingPostId === post.id;
  return (
    <article className="rounded-2xl border border-stone-200 bg-white p-3 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="mt-1 flex h-10 w-10 items-center justify-center rounded-xl border border-stone-200 bg-stone-50 text-stone-500">
          <Pencil className="h-4 w-4" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-sm font-semibold text-stone-900">{post.title}</h3>
            <StatusPill tone={statusTone(post.status)}>{statusLabel(post.status)}</StatusPill>
          </div>
          <div className="mt-1 text-xs text-stone-500">
            {formatSchedule(post.scheduledAt)}{post.productSku ? ` • ${post.productSku}` : ""}
          </div>
          <p className="mt-1 line-clamp-2 text-xs leading-5 text-stone-600">{post.caption}</p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onStartEdit(post)}
          className="inline-flex h-9 items-center justify-center rounded-xl border border-stone-200 px-3 text-xs font-semibold text-stone-700"
        >
          Sửa
        </button>
        <button
          type="button"
          onClick={() => onOpenSchedule(post)}
          className="inline-flex h-9 items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 px-3 text-xs font-semibold text-emerald-700"
          title={`Chỉnh lịch cho ${selectedPageIds.length || 1} page`}
        >
          Lịch
        </button>
        <button
          type="button"
          onClick={() => onPublish(post)}
          className="inline-flex h-9 items-center justify-center rounded-xl border border-blue-200 bg-blue-50 px-3 text-xs font-semibold text-blue-700"
        >
          Gửi
        </button>
        <button
          type="button"
          onClick={() => onRequestDelete(post)}
          disabled={deleting}
          className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 text-xs font-semibold text-red-700 disabled:opacity-50"
        >
          {deleting ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />}
          {deleting ? "Đang xoá..." : "Xoá khỏi CRM"}
        </button>
      </div>
    </article>
  );
}

export function ContentPlannerPostList({
  posts,
  pages,
  selectedPageIds,
  publishJobs,
  editing,
  scheduleDraft,
  deleteCandidate,
  deletingPostId,
  deleteAllOpen,
  deleteAllConfirmed,
  deleteProgress,
  onStartEdit,
  onEditChange,
  onEditPageToggle,
  onCancelEdit,
  onSaveEdit,
  onOpenSchedule,
  onScheduleChange,
  onCancelSchedule,
  onSaveSchedule,
  onPublish,
  onRequestDelete,
  onCancelDelete,
  onConfirmDelete,
  onRequestDeleteAll,
  onDeleteAllConfirmedChange,
  onCancelDeleteAll,
  onConfirmDeleteAll
}: ContentPlannerPostListProps) {
  const schedulePost = scheduleDraft ? posts.find((post) => post.id === scheduleDraft.id) ?? null : null;
  const orderedPosts = [...posts].sort((left, right) => {
    const leftValue = left.scheduledAt || left.updatedAt || left.id;
    const rightValue = right.scheduledAt || right.updatedAt || right.id;
    return rightValue.localeCompare(leftValue);
  });

  return (
    <section className="rounded-[24px] border border-stone-200 bg-[#fbfaf6] p-3">
      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold text-stone-900">Bài trên Content Planner</h2>
          <div className="mt-1 flex flex-wrap gap-2">
            <StatusPill tone="warning">{posts.filter((post) => post.status === "draft").length} nháp</StatusPill>
            <StatusPill tone="success">{posts.filter((post) => post.status === "scheduled").length} lịch</StatusPill>
            <StatusPill tone="neutral">{posts.length} tổng</StatusPill>
          </div>
        </div>
        <button
          type="button"
          onClick={onRequestDeleteAll}
          disabled={posts.length === 0 || Boolean(deleteProgress)}
          className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-3 text-sm font-semibold text-amber-900 disabled:opacity-50 sm:w-auto"
        >
          <Trash2 className="h-4 w-4" aria-hidden="true" />
          Dọn trống planner ({posts.length})
        </button>
      </div>

      <div className="space-y-2">
        {orderedPosts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-stone-300 bg-white px-4 py-6 text-sm text-stone-500">
            Chưa có bài nháp hoặc lịch đăng.
          </div>
        ) : (
          orderedPosts.map((post) => (
            <PlannerListRow
              key={post.id}
              post={post}
              selectedPageIds={selectedPageIds}
              deletingPostId={deletingPostId}
              onStartEdit={onStartEdit}
              onOpenSchedule={onOpenSchedule}
              onPublish={onPublish}
              onRequestDelete={onRequestDelete}
            />
          ))
        )}
      </div>

      {publishJobs.length > 0 ? (
        <div className="mt-3 rounded-2xl border border-stone-200 bg-white p-3">
          <div className="mb-2 text-sm font-semibold text-stone-900">Lệnh đăng mới nhất</div>
          <div className="space-y-2">
            {publishJobs.map((job) => (
              <div key={job.id} className="flex items-center justify-between gap-3 rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-xs">
                <div className="min-w-0">
                  <div className="truncate font-semibold text-stone-900">Fanpage {job.pageId}</div>
                  {job.error ? <div className="truncate text-stone-500">{job.error}</div> : null}
                </div>
                <StatusPill tone={jobTone(job.status, job.dryRun)}>{publishJobLabel(job.status, job.dryRun)}</StatusPill>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {editing ? (
        <Modal title="Chỉnh sửa bài" onClose={onCancelEdit}>
          <div className="grid gap-3">
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Tiêu đề</span>
              <input
                value={editing.title}
                onChange={(event) => onEditChange({ title: event.target.value })}
                className="mt-1 min-h-10 w-full rounded-md border border-slate-200 px-3 text-sm font-semibold focus-ring"
              />
            </label>
            <ProductSearchPicker
              label="Sản phẩm đã chọn"
              selectedSku={editing.productSku}
              onSelect={(product: ProductWithInventory | null) => onEditChange({ productSku: product?.sku ?? "" })}
            />
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Caption</span>
              <textarea
                value={editing.caption}
                onChange={(event) => onEditChange({ caption: event.target.value })}
                className="mt-1 min-h-28 w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus-ring"
              />
            </label>
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="block">
                <span className="text-sm font-medium text-slate-700">CTA</span>
                <input
                  value={editing.cta}
                  onChange={(event) => onEditChange({ cta: event.target.value })}
                  className="mt-1 min-h-10 w-full rounded-md border border-slate-200 px-3 text-sm focus-ring"
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Lịch đăng</span>
                <input
                  type="datetime-local"
                  value={editing.scheduledAt}
                  onChange={(event) => onEditChange({ scheduledAt: event.target.value })}
                  className="mt-1 min-h-10 w-full rounded-md border border-slate-200 px-3 text-sm focus-ring"
                />
              </label>
            </div>
            <GoldenHourButtons onSelect={(value) => onEditChange({ scheduledAt: value })} />
            <div>
              <div className="text-sm font-medium text-slate-700">Fanpage nhận bài</div>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {pages.map((page) => (
                  <label key={page.id} className="flex min-h-10 items-center gap-2 rounded-md border border-slate-200 px-3 text-sm">
                    <input
                      type="checkbox"
                      checked={editing.pageIds.includes(page.id)}
                      onChange={(event) => onEditPageToggle(page.id, event.target.checked)}
                    />
                    <span className="min-w-0 truncate">{page.name}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <button type="button" onClick={onCancelEdit} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-slate-200 px-3 text-sm font-semibold text-slate-700 focus-ring">
              <X className="h-4 w-4" aria-hidden="true" />
              Huỷ
            </button>
            <button type="button" onClick={onSaveEdit} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-brand-600 px-3 text-sm font-semibold text-white focus-ring">
              <Save className="h-4 w-4" aria-hidden="true" />
              Lưu chỉnh sửa
            </button>
          </div>
        </Modal>
      ) : null}

      {scheduleDraft && schedulePost ? (
        <Modal title="Chỉnh lịch đăng" onClose={onCancelSchedule}>
          <div className="grid gap-3">
            <div>
              <div className="text-sm font-semibold text-slate-900">{scheduleDraft.title}</div>
              <div className="mt-1 text-xs text-slate-500">Lịch hiện tại: {formatSchedule(schedulePost.scheduledAt)}</div>
            </div>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Ngày giờ cụ thể</span>
              <input
                type="datetime-local"
                value={scheduleDraft.scheduledAt}
                onChange={(event) => onScheduleChange(event.target.value)}
                className="mt-1 min-h-10 w-full rounded-md border border-slate-200 px-3 text-sm focus-ring"
              />
            </label>
            <GoldenHourButtons onSelect={onScheduleChange} />
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <button type="button" onClick={onCancelSchedule} className="inline-flex min-h-10 items-center justify-center rounded-md border border-slate-200 px-3 text-sm font-semibold text-slate-700 focus-ring">
              Huỷ
            </button>
            <button type="button" onClick={() => onSaveSchedule(schedulePost)} className="inline-flex min-h-10 items-center justify-center rounded-md bg-brand-600 px-3 text-sm font-semibold text-white focus-ring">
              Lưu lịch
            </button>
          </div>
        </Modal>
      ) : null}

      {deleteCandidate ? (
        <Modal title="Xoá bài khỏi CRM" onClose={onCancelDelete}>
          <p className="text-sm leading-6 text-slate-700">
            Bản ghi, media và job ảnh liên quan sẽ bị xoá khỏi CRM.
          </p>
          <p className="mt-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">
            Bài thật đã đăng trên Facebook vẫn được giữ nguyên.
          </p>
          <p className="mt-2 text-sm font-semibold text-slate-900">{deleteCandidate.title}</p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <button type="button" onClick={onCancelDelete} className="inline-flex min-h-10 items-center justify-center rounded-md border border-slate-200 px-3 text-sm font-semibold text-slate-700 focus-ring">
              Huỷ
            </button>
            <button type="button" onClick={() => onConfirmDelete(deleteCandidate)} disabled={deletingPostId === deleteCandidate.id} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-red-600 px-3 text-sm font-semibold text-white focus-ring disabled:opacity-60">
              {deletingPostId === deleteCandidate.id ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
              Xác nhận xoá khỏi CRM
            </button>
          </div>
        </Modal>
      ) : null}

      {deleteAllOpen ? (
        <Modal title="Dọn trống Content Planner" onClose={onCancelDeleteAll}>
          <p className="text-sm leading-6 text-slate-700">
            Thao tác này sẽ xoá toàn bộ <strong>{posts.length} bài</strong>, media và job ảnh liên quan khỏi FBSHV CRM.
          </p>
          <p className="mt-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">
            Không gọi Meta API. Bài thật trên Facebook hoàn toàn không bị xoá.
          </p>
          <label className="mt-4 flex min-h-11 items-start gap-3 rounded-xl border border-stone-200 bg-stone-50 p-3 text-sm text-stone-700">
            <input
              type="checkbox"
              checked={deleteAllConfirmed}
              disabled={Boolean(deleteProgress)}
              onChange={(event) => onDeleteAllConfirmedChange(event.target.checked)}
              className="mt-0.5 h-4 w-4"
            />
            <span>Tôi hiểu và muốn xoá toàn bộ {posts.length} bản ghi khỏi CRM.</span>
          </label>
          {deleteProgress ? (
            <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm font-semibold text-blue-800">
              <div>Đang dọn: {deleteProgress.completed}/{deleteProgress.total} bài</div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-blue-100">
                <div
                  className="h-full rounded-full bg-blue-600 transition-all"
                  style={{ width: `${Math.round((deleteProgress.completed / deleteProgress.total) * 100)}%` }}
                />
              </div>
            </div>
          ) : null}
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <button type="button" onClick={onCancelDeleteAll} disabled={Boolean(deleteProgress)} className="inline-flex min-h-10 items-center justify-center rounded-md border border-slate-200 px-3 text-sm font-semibold text-slate-700 focus-ring disabled:opacity-50">
              Huỷ
            </button>
            <button type="button" onClick={onConfirmDeleteAll} disabled={!deleteAllConfirmed || Boolean(deleteProgress)} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-red-600 px-3 text-sm font-semibold text-white focus-ring disabled:opacity-50">
              {deleteProgress ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Trash2 className="h-4 w-4" aria-hidden="true" />}
              Xác nhận dọn trống
            </button>
          </div>
        </Modal>
      ) : null}
    </section>
  );
}

function Modal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-3">
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-md bg-white p-4 shadow-xl">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 className="text-base font-semibold text-slate-900">{title}</h3>
          <button type="button" onClick={onClose} className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 text-slate-700 focus-ring" aria-label="Đóng">
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
