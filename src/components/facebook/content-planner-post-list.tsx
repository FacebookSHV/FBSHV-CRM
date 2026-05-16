"use client";

import { CalendarPlus, Pencil, Save, Send, Trash2, X } from "lucide-react";
import type { ReactNode } from "react";
import { ProductSearchPicker } from "@/components/products/product-search-picker";
import { StatusPill } from "@/components/ui/status-pill";
import type { ProductWithInventory } from "@/lib/ecommerce/types";
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
};

function statusTone(status: ContentPost["status"]) {
  if (status === "scheduled" || status === "published") return "success" as const;
  if (status === "failed") return "danger" as const;
  if (status === "cancelled") return "warning" as const;
  return "neutral" as const;
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

function canDelete(post: ContentPost) {
  return post.status === "draft" || post.status === "scheduled";
}

export function ContentPlannerPostList({
  posts,
  pages,
  selectedPageIds,
  publishJobs,
  editing,
  scheduleDraft,
  deleteCandidate,
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
  onConfirmDelete
}: ContentPlannerPostListProps) {
  const schedulePost = scheduleDraft ? posts.find((post) => post.id === scheduleDraft.id) ?? null : null;

  return (
    <section className="mt-4 rounded-md border border-slate-200 bg-white shadow-soft">
      <div className="border-b border-slate-200 px-4 py-3">
        <h2 className="text-sm font-semibold text-ink">Bài nháp và bài đã lên lịch</h2>
      </div>
      <div className="divide-y divide-slate-100">
        {posts.length === 0 ? (
          <div className="p-4 text-sm text-slate-600">Chưa có bài nháp hoặc lịch đăng trong D1.</div>
        ) : null}
        {posts.map((post) => (
          <article key={post.id} className="grid gap-3 p-4 md:grid-cols-[1fr_auto] md:items-center">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="min-w-0 truncate text-sm font-semibold text-ink">{post.title}</h3>
                <StatusPill tone={statusTone(post.status)}>{post.status}</StatusPill>
                {post.productSku ? <span className="text-xs text-slate-500">SKU {post.productSku}</span> : null}
              </div>
              <p className="mt-2 line-clamp-2 text-sm text-slate-600">{post.caption}</p>
              <p className="mt-1 text-xs text-slate-500">{formatSchedule(post.scheduledAt)}</p>
            </div>

            <div className="grid grid-cols-4 gap-2 md:flex md:justify-end">
              <button
                type="button"
                onClick={() => onStartEdit(post)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-slate-200 text-slate-700 focus-ring"
                aria-label="Edit bài"
                title="Edit bài"
              >
                <Pencil className="h-4 w-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => onOpenSchedule(post)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-emerald-200 text-emerald-700 focus-ring"
                aria-label="Chỉnh lịch đăng"
                title={`Chỉnh lịch cho ${selectedPageIds.length || 1} Page`}
              >
                <CalendarPlus className="h-4 w-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => onPublish(post)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-brand-200 text-brand-700 focus-ring"
                aria-label="Tạo job đăng"
                title={`Tạo job đăng ${selectedPageIds.length || 1} Page`}
              >
                <Send className="h-4 w-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => onRequestDelete(post)}
                disabled={!canDelete(post)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-red-200 text-red-700 focus-ring disabled:opacity-40"
                aria-label="Delete bài nháp hoặc scheduled"
                title={canDelete(post) ? "Delete bài nháp/scheduled" : "Chỉ xóa draft hoặc scheduled"}
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </article>
        ))}
      </div>

      {publishJobs.length > 0 ? (
        <div className="border-t border-slate-200 p-4">
          <h3 className="text-sm font-semibold text-ink">Publish job preview mới nhất</h3>
          <div className="mt-3 grid gap-2">
            {publishJobs.map((job) => (
              <div key={job.id} className="grid gap-2 rounded-md border border-slate-200 p-3 text-sm sm:grid-cols-[1fr_auto]">
                <div className="min-w-0">
                  <div className="font-medium text-ink">Page {job.pageId}</div>
                  {job.error ? <div className="mt-1 text-xs text-slate-600">{job.error}</div> : null}
                </div>
                <StatusPill tone={jobTone(job.status, job.dryRun)}>
                  {job.dryRun ? "dry_run" : job.status}
                </StatusPill>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {editing ? (
        <Modal title="Edit bài" onClose={onCancelEdit}>
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
              Hủy
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
              <div className="text-sm font-semibold text-ink">{scheduleDraft.title}</div>
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
              Hủy
            </button>
            <button type="button" onClick={() => onSaveSchedule(schedulePost)} className="inline-flex min-h-10 items-center justify-center rounded-md bg-brand-600 px-3 text-sm font-semibold text-white focus-ring">
              Lưu lịch
            </button>
          </div>
        </Modal>
      ) : null}

      {deleteCandidate ? (
        <Modal title="Xác nhận xóa" onClose={onCancelDelete}>
          <p className="text-sm leading-6 text-slate-700">Bạn có chắc muốn xoá bài này không?</p>
          <p className="mt-2 text-sm font-semibold text-ink">{deleteCandidate.title}</p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <button type="button" onClick={onCancelDelete} className="inline-flex min-h-10 items-center justify-center rounded-md border border-slate-200 px-3 text-sm font-semibold text-slate-700 focus-ring">
              Huỷ
            </button>
            <button type="button" onClick={() => onConfirmDelete(deleteCandidate)} className="inline-flex min-h-10 items-center justify-center rounded-md bg-red-600 px-3 text-sm font-semibold text-white focus-ring">
              Xác nhận xoá
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
          <h3 className="text-base font-semibold text-ink">{title}</h3>
          <button type="button" onClick={onClose} className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 text-slate-700 focus-ring" aria-label="Đóng">
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
