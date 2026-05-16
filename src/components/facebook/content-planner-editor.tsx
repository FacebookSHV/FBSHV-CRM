"use client";

import { Clock3, Save, Send, Upload } from "lucide-react";
import type { ProductWithInventory } from "@/lib/ecommerce/types";
import { ProductSearchPicker } from "@/components/products/product-search-picker";
import type { FacebookPage } from "./content-planner-types";

type ContentPlannerEditorProps = {
  pages: FacebookPage[];
  selectedPageIds: string[];
  selectedProductSku: string;
  mediaFile: File | null;
  mediaPreviewUrl: string;
  manualTitle: string;
  manualCaption: string;
  manualCta: string;
  scheduledAt: string;
  onTitleChange: (value: string) => void;
  onCaptionChange: (value: string) => void;
  onCtaChange: (value: string) => void;
  onScheduledAtChange: (value: string) => void;
  onProductSelect: (product: ProductWithInventory | null) => void;
  onPageToggle: (pageId: string, checked: boolean) => void;
  onMediaChange: (file: File | null) => void;
  onSave: (mode: "draft" | "schedule" | "publish") => void;
};

const goldenHours = [
  { label: "Sáng", range: "08:00-09:30", time: "08:00" },
  { label: "Trưa", range: "11:00-12:30", time: "11:00" },
  { label: "Tối", range: "19:30-21:30", time: "19:30" }
];

function datetimeLocalValue(date: Date) {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function nextGoldenHour(time: string) {
  const [hour, minute] = time.split(":").map(Number);
  const date = new Date();
  date.setHours(hour ?? 8, minute ?? 0, 0, 0);
  if (date.getTime() <= Date.now()) date.setDate(date.getDate() + 1);
  return datetimeLocalValue(date);
}

export function ContentPlannerEditor({
  pages,
  selectedPageIds,
  selectedProductSku,
  mediaFile,
  mediaPreviewUrl,
  manualTitle,
  manualCaption,
  manualCta,
  scheduledAt,
  onTitleChange,
  onCaptionChange,
  onCtaChange,
  onScheduledAtChange,
  onProductSelect,
  onPageToggle,
  onMediaChange,
  onSave
}: ContentPlannerEditorProps) {
  return (
    <section className="mb-4 rounded-md border border-slate-200 bg-white p-4 shadow-soft">
      <div className="grid gap-4 lg:grid-cols-[1fr_0.9fr]">
        <div className="grid gap-3">
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Tiêu đề</span>
            <input
              value={manualTitle}
              onChange={(event) => onTitleChange(event.target.value)}
              className="mt-1 min-h-11 w-full rounded-md border border-slate-200 px-3 text-sm focus-ring"
              placeholder="Tên chiến dịch hoặc sản phẩm"
            />
          </label>

          <ProductSearchPicker
            label="Chọn sản phẩm thật"
            selectedSku={selectedProductSku}
            onSelect={onProductSelect}
          />

          <label className="block">
            <span className="text-sm font-medium text-slate-700">Caption</span>
            <textarea
              value={manualCaption}
              onChange={(event) => onCaptionChange(event.target.value)}
              className="mt-1 min-h-32 w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus-ring"
              placeholder="Nhập nội dung bài đăng"
            />
          </label>
        </div>

        <div className="grid content-start gap-3">
          <label className="block">
            <span className="text-sm font-medium text-slate-700">CTA</span>
            <select
              value={manualCta}
              onChange={(event) => onCtaChange(event.target.value)}
              className="mt-1 min-h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-sm focus-ring"
            >
              <option>Nhắn tin</option>
              <option>Bình luận</option>
              <option>Mua ngay</option>
              <option>Xem thêm</option>
            </select>
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">Ngày giờ đăng cụ thể</span>
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(event) => onScheduledAtChange(event.target.value)}
              className="mt-1 min-h-11 w-full rounded-md border border-slate-200 px-3 text-sm focus-ring"
            />
          </label>

          <div>
            <div className="text-sm font-medium text-slate-700">Giờ vàng</div>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {goldenHours.map((item) => (
                <button
                  type="button"
                  key={item.label}
                  onClick={() => onScheduledAtChange(nextGoldenHour(item.time))}
                  className="inline-flex min-h-11 flex-col items-center justify-center rounded-md border border-slate-200 px-2 text-xs font-semibold text-slate-700 focus-ring hover:bg-slate-50"
                  title={item.range}
                >
                  <Clock3 className="mb-1 h-4 w-4" aria-hidden="true" />
                  <span>{item.label}</span>
                  <span className="font-normal text-slate-500">{item.range}</span>
                </button>
              ))}
            </div>
          </div>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">Ảnh/video đăng bài</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime"
              onChange={(event) => onMediaChange(event.target.files?.[0] ?? null)}
              className="mt-1 min-h-11 w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus-ring"
            />
          </label>

          {mediaPreviewUrl ? (
            <div className="rounded-md border border-slate-200 bg-slate-50 p-2">
              <div className="mb-2 text-xs font-medium text-slate-600">{mediaFile?.name}</div>
              {mediaFile?.type.startsWith("video/") ? (
                <video src={mediaPreviewUrl} className="max-h-64 w-full rounded-md bg-black object-contain" controls />
              ) : (
                // NEO: Preview media trước khi upload R2 để operator kiểm tra nội dung rõ ràng.
                // eslint-disable-next-line @next/next/no-img-element
                <img src={mediaPreviewUrl} alt="Preview media" className="max-h-64 w-full rounded-md object-contain" />
              )}
            </div>
          ) : null}
        </div>
      </div>

      <div className="mt-4">
        <div className="text-sm font-medium text-slate-700">Fanpage nhận bài</div>
        <div className="mt-2 grid gap-2 md:grid-cols-3">
          {pages.map((page) => (
            <label key={page.id} className="flex min-h-11 items-center gap-2 rounded-md border border-slate-200 px-3 text-sm">
              <input
                type="checkbox"
                checked={selectedPageIds.includes(page.id)}
                onChange={(event) => onPageToggle(page.id, event.target.checked)}
              />
              <span className="min-w-0 truncate">{page.name}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        <button
          type="button"
          onClick={() => onSave("draft")}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-slate-200 px-4 text-sm font-semibold text-slate-700 focus-ring"
        >
          <Upload className="h-4 w-4" aria-hidden="true" />
          Lưu nháp
        </button>
        <button
          type="button"
          onClick={() => onSave("schedule")}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-emerald-200 px-4 text-sm font-semibold text-emerald-700 focus-ring"
        >
          <Save className="h-4 w-4" aria-hidden="true" />
          Lưu và lên lịch
        </button>
        <button
          type="button"
          onClick={() => onSave("publish")}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-brand-600 px-4 text-sm font-semibold text-white focus-ring"
        >
          <Send className="h-4 w-4" aria-hidden="true" />
          Tạo job nhiều Page
        </button>
      </div>
    </section>
  );
}
