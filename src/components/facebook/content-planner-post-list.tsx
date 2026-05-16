"use client";

import { CalendarPlus, Pencil, Save, Send, Trash2, X } from "lucide-react";
import { StatusPill } from "@/components/ui/status-pill";
import type { ContentPost, EditPostDraft } from "./content-planner-types";

type ContentPlannerPostListProps = {
  posts: ContentPost[];
  selectedPageIds: string[];
  scheduledAt: string;
  editing: EditPostDraft | null;
  onStartEdit: (post: ContentPost) => void;
  onEditChange: (patch: Partial<EditPostDraft>) => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
  onSchedule: (post: ContentPost) => void;
  onPublish: (post: ContentPost) => void;
  onDelete: (post: ContentPost) => void;
};

function statusTone(status: ContentPost["status"]) {
  if (status === "scheduled" || status === "published") return "success" as const;
  if (status === "failed") return "danger" as const;
  if (status === "cancelled") return "warning" as const;
  return "neutral" as const;
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
  selectedPageIds,
  scheduledAt,
  editing,
  onStartEdit,
  onEditChange,
  onCancelEdit,
  onSaveEdit,
  onSchedule,
  onPublish,
  onDelete
}: ContentPlannerPostListProps) {
  return (
    <section className="mt-4 rounded-md border border-slate-200 bg-white shadow-soft">
      <div className="border-b border-slate-200 px-4 py-3">
        <h2 className="text-sm font-semibold text-ink">Bài nháp và bài đã lên lịch</h2>
      </div>
      <div className="divide-y divide-slate-100">
        {posts.map((post) => {
          const isEditing = editing?.id === post.id;
          return (
            <article key={post.id} className="grid gap-3 p-4 md:grid-cols-[1fr_auto] md:items-center">
              <div className="min-w-0">
                {isEditing ? (
                  <div className="grid gap-2">
                    <input
                      value={editing.title}
                      onChange={(event) => onEditChange({ title: event.target.value })}
                      className="min-h-10 rounded-md border border-slate-200 px-3 text-sm font-semibold focus-ring"
                    />
                    <textarea
                      value={editing.caption}
                      onChange={(event) => onEditChange({ caption: event.target.value })}
                      className="min-h-24 rounded-md border border-slate-200 px-3 py-2 text-sm focus-ring"
                    />
                    <div className="grid gap-2 sm:grid-cols-2">
                      <input
                        value={editing.cta}
                        onChange={(event) => onEditChange({ cta: event.target.value })}
                        className="min-h-10 rounded-md border border-slate-200 px-3 text-sm focus-ring"
                      />
                      <input
                        type="datetime-local"
                        value={editing.scheduledAt}
                        onChange={(event) => onEditChange({ scheduledAt: event.target.value })}
                        className="min-h-10 rounded-md border border-slate-200 px-3 text-sm focus-ring"
                      />
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="min-w-0 truncate text-sm font-semibold text-ink">{post.title}</h3>
                      <StatusPill tone={statusTone(post.status)}>{post.status}</StatusPill>
                      {post.productSku ? <span className="text-xs text-slate-500">SKU {post.productSku}</span> : null}
                    </div>
                    <p className="mt-2 line-clamp-2 text-sm text-slate-600">{post.caption}</p>
                    <p className="mt-1 text-xs text-slate-500">{formatSchedule(post.scheduledAt)}</p>
                  </>
                )}
              </div>

              <div className="grid grid-cols-5 gap-2 md:flex md:justify-end">
                {isEditing ? (
                  <>
                    <button
                      type="button"
                      onClick={onSaveEdit}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-emerald-200 text-emerald-700 focus-ring"
                      aria-label="Lưu chỉnh sửa"
                      title="Lưu chỉnh sửa"
                    >
                      <Save className="h-4 w-4" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={onCancelEdit}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-slate-200 text-slate-700 focus-ring"
                      aria-label="Hủy chỉnh sửa"
                      title="Hủy chỉnh sửa"
                    >
                      <X className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => onStartEdit(post)}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-slate-200 text-slate-700 focus-ring"
                    aria-label="Edit bài"
                    title="Edit bài"
                  >
                    <Pencil className="h-4 w-4" aria-hidden="true" />
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => onSchedule(post)}
                  disabled={!scheduledAt && !editing?.scheduledAt}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-emerald-200 text-emerald-700 focus-ring disabled:opacity-40"
                  aria-label="Lên lịch giờ đã chọn"
                  title={`Lên lịch ${selectedPageIds.length || 1} Page`}
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
                  onClick={() => onDelete(post)}
                  disabled={!canDelete(post)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-red-200 text-red-700 focus-ring disabled:opacity-40"
                  aria-label="Delete bài nháp hoặc scheduled"
                  title={canDelete(post) ? "Delete bài nháp/scheduled" : "Chỉ xóa draft hoặc scheduled"}
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
