"use client";

import { CalendarDays, Clock3, ImageUp, Save, Send, Upload } from "lucide-react";
import type { ReactNode } from "react";
import type { ProductWithInventory } from "@/lib/ecommerce/types";
import { ProductSearchPicker } from "@/components/products/product-search-picker";
import type { FacebookPage } from "./content-planner-types";

type ContentPlannerEditorProps = {
  pages: FacebookPage[];
  selectedPageIds: string[];
  selectedProductSku: string;
  selectedProductName?: string;
  mediaFile: File | null;
  mediaPreviewUrl: string;
  mediaSourceLabel?: string;
  manualTitle: string;
  manualCaption: string;
  manualCta: string;
  scheduledAt: string;
  aiImagePicker?: ReactNode;
  onTitleChange: (value: string) => void;
  onCaptionChange: (value: string) => void;
  onCtaChange: (value: string) => void;
  onScheduledAtChange: (value: string) => void;
  onProductSelect: (product: ProductWithInventory | null) => void;
  onPageToggle: (pageId: string, checked: boolean) => void;
  onMediaChange: (file: File | null) => void;
  onSave: (mode: "draft" | "schedule" | "publish") => void;
};

export const goldenHours = [
  { label: "Sáng", range: "08:00-09:30", time: "08:00" },
  { label: "Trưa", range: "11:00-12:30", time: "11:00" },
  { label: "Tối", range: "19:30-21:30", time: "19:30" }
];

function datetimeLocalValue(date: Date) {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

export function nextGoldenHour(time: string) {
  const [hour, minute] = time.split(":").map(Number);
  const date = new Date();
  date.setHours(hour ?? 8, minute ?? 0, 0, 0);
  if (date.getTime() <= Date.now()) date.setDate(date.getDate() + 1);
  return datetimeLocalValue(date);
}

export function GoldenHourButtons({ onSelect }: { onSelect: (value: string) => void }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {goldenHours.map((item) => (
        <button
          type="button"
          key={item.label}
          onClick={() => onSelect(nextGoldenHour(item.time))}
          className="inline-flex min-h-14 flex-col items-center justify-center rounded-2xl border border-stone-200 bg-white px-2 text-xs font-semibold text-stone-700 transition hover:border-blue-200 hover:bg-blue-50"
          title={item.range}
        >
          <Clock3 className="mb-1 h-4 w-4" aria-hidden="true" />
          <span>{item.label}</span>
          <span className="font-normal text-stone-500">{item.range}</span>
        </button>
      ))}
    </div>
  );
}

function PlannerSectionTitle({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="mb-2">
      <div className="text-sm font-semibold text-stone-900">{title}</div>
      {hint ? <div className="mt-1 text-xs leading-5 text-stone-500">{hint}</div> : null}
    </div>
  );
}

export function ContentPlannerEditor({
  pages,
  selectedPageIds,
  selectedProductSku,
  selectedProductName,
  mediaFile,
  mediaPreviewUrl,
  mediaSourceLabel,
  manualTitle,
  manualCaption,
  manualCta,
  scheduledAt,
  aiImagePicker,
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
    <section className="rounded-[26px] border border-stone-200 bg-[#faf7ef] p-3 shadow-[0_24px_64px_rgba(15,23,42,0.08)] md:p-4">
      <div className="grid gap-3 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-[22px] border border-stone-200 bg-white p-3 md:p-4">
          <PlannerSectionTitle title="Sản phẩm" hint="Chọn sản phẩm thật trước, sau đó ảnh AI và caption sẽ bám đúng SKU." />
          <ProductSearchPicker label="Chọn sản phẩm để render" selectedSku={selectedProductSku} onSelect={onProductSelect} />
          <div className="mt-2 rounded-2xl border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-600">
            <span className="font-semibold text-stone-900">Ảnh AI theo SKU</span>{" "}
            {selectedProductSku ? (
              <span className="rounded-full bg-lime-100 px-2 py-0.5 text-xs font-semibold text-lime-700">{selectedProductName || selectedProductSku}</span>
            ) : (
              "sẽ hiện ngay tại đây sau khi chọn sản phẩm"
            )}
          </div>

          <div className="mt-3">{aiImagePicker}</div>

          <div className="mt-4">
            <PlannerSectionTitle title="Caption" hint="Điền phần chốt ý chính cho bài. Phần CTA và lịch đăng nằm cạnh phải." />
            <input
              value={manualTitle}
              onChange={(event) => onTitleChange(event.target.value)}
              className="min-h-11 w-full rounded-2xl border border-stone-200 bg-stone-50 px-3 text-sm text-stone-900 outline-none transition focus:border-blue-300 focus:bg-white"
              placeholder="Tên sản phẩm hoặc tiêu đề bài đăng"
            />
            <textarea
              value={manualCaption}
              onChange={(event) => onCaptionChange(event.target.value)}
              className="mt-2 min-h-28 w-full rounded-2xl border border-stone-200 bg-stone-50 px-3 py-3 text-sm text-stone-900 outline-none transition focus:border-blue-300 focus:bg-white"
              placeholder="Viết caption ngắn, rõ, dễ đọc trên mobile"
            />
          </div>
        </div>

        <div className="space-y-3">
          <div className="rounded-[22px] border border-stone-200 bg-white p-4">
            <PlannerSectionTitle title="Lịch đăng" hint="Chọn giờ vàng hoặc nhập ngày giờ cụ thể cho bài này." />
            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.12em] text-stone-500">Ngày giờ</span>
              <div className="relative">
                <input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(event) => onScheduledAtChange(event.target.value)}
                  className="min-h-11 w-full rounded-2xl border border-stone-200 bg-stone-50 px-3 pr-11 text-sm text-stone-900 outline-none transition focus:border-blue-300 focus:bg-white"
                />
                <CalendarDays className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" aria-hidden="true" />
              </div>
            </label>
            <div className="mt-3">
              <GoldenHourButtons onSelect={onScheduledAtChange} />
            </div>
          </div>

          <div className="rounded-[22px] border border-stone-200 bg-white p-4">
            <PlannerSectionTitle title="CTA & Fanpage" hint="Tách riêng nút kêu gọi hành động và nơi bài sẽ được gửi." />
            <select
              value={manualCta}
              onChange={(event) => onCtaChange(event.target.value)}
              className="min-h-11 w-full rounded-2xl border border-stone-200 bg-stone-50 px-3 text-sm text-stone-900 outline-none transition focus:border-blue-300 focus:bg-white"
            >
              <option>Nhắn tin</option>
              <option>Bình luận</option>
              <option>Mua ngay</option>
              <option>Xem thêm</option>
            </select>
            <div className="mt-3 grid gap-2">
              {pages.map((page) => (
                <label key={page.id} className="flex min-h-11 items-center gap-2 rounded-2xl border border-stone-200 px-3 text-sm text-stone-700">
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

          <div className="rounded-[22px] border border-stone-200 bg-white p-4">
            <PlannerSectionTitle title="Ảnh/video thủ công" hint="Nếu không dùng ảnh AI thì tải file tay tại đây." />
            <label className="flex min-h-24 cursor-pointer flex-col items-center justify-center rounded-[22px] border border-dashed border-stone-300 bg-stone-50 px-4 text-center transition hover:border-blue-300 hover:bg-blue-50">
              <ImageUp className="h-5 w-5 text-stone-500" aria-hidden="true" />
              <span className="mt-2 text-sm font-medium text-stone-700">Upload ảnh hoặc video</span>
              <span className="mt-1 text-xs text-stone-500">JPEG, PNG, WebP, MP4, MOV</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime"
                onChange={(event) => onMediaChange(event.target.files?.[0] ?? null)}
                className="sr-only"
              />
            </label>
            {mediaPreviewUrl ? (
              <div className="mt-3 rounded-[22px] border border-stone-200 bg-stone-50 p-3">
                <div className="mb-2 text-xs font-medium text-stone-500">{mediaSourceLabel || mediaFile?.name}</div>
                {mediaFile?.type.startsWith("video/") ? (
                  <video src={mediaPreviewUrl} className="max-h-64 w-full rounded-2xl bg-black object-contain" controls />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={mediaPreviewUrl} alt="Preview media" className="max-h-64 w-full rounded-2xl object-contain" />
                )}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        <button
          type="button"
          onClick={() => onSave("draft")}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-stone-200 bg-white px-4 text-sm font-semibold text-stone-700 transition hover:border-stone-300"
        >
          <Upload className="h-4 w-4" aria-hidden="true" />
          Lưu nháp
        </button>
        <button
          type="button"
          onClick={() => onSave("schedule")}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 text-sm font-semibold text-emerald-700 transition hover:border-emerald-300"
        >
          <Save className="h-4 w-4" aria-hidden="true" />
          Lưu và lên lịch
        </button>
        <button
          type="button"
          onClick={() => onSave("publish")}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-[#6f8fe8] px-4 text-sm font-semibold text-white transition hover:bg-[#5f81df]"
        >
          <Send className="h-4 w-4" aria-hidden="true" />
          Gửi bài
        </button>
      </div>
    </section>
  );
}
