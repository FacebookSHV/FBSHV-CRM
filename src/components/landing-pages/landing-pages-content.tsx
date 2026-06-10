"use client";

import Link from "next/link";
import { ExternalLink, Images, LayoutTemplate, Rocket, Send, WandSparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/pages/page-header";
import { ProductSearchPicker } from "@/components/products/product-search-picker";
import { StatusPill } from "@/components/ui/status-pill";
import type { ProductWithInventory } from "@/lib/ecommerce/types";
import type { LandingPage, LandingTemplate, LandingTemplateId } from "@/lib/landing-pages/types";

type ApiEnvelope<T> = { success: true; data: T } | { success: false; error?: string };

function statusLabel(status: LandingPage["status"]) {
  if (status === "published") return "Đã publish";
  if (status === "archived") return "Đã lưu trữ";
  return "Nháp";
}

function imageStatusLabel(page: LandingPage) {
  if (page.creativeImages.length > 0) return `${page.creativeImages.length} ảnh AI`;
  if (page.imageJobQueued) return "Đã xếp job ảnh AI";
  if (page.imageJobError) return "Job ảnh cần kiểm tra";
  return "Chưa có ảnh AI";
}

function copyStatusLabel(page: LandingPage) {
  if (page.aiMode === "ai") return "Copy AI";
  if (page.aiMode === "template") return "Copy template";
  return "Copy đã lưu";
}

export function LandingPagesContent({
  initialPages,
  templates,
  products
}: {
  initialPages: LandingPage[];
  templates: LandingTemplate[];
  products: ProductWithInventory[];
}) {
  const [pages, setPages] = useState(initialPages);
  const [selectedProduct, setSelectedProduct] = useState<ProductWithInventory | null>(products[0] ?? null);
  const [templateId, setTemplateId] = useState<LandingTemplateId>("sales_fast");
  const [createAiImages, setCreateAiImages] = useState(true);
  const [status, setStatus] = useState("Chọn sản phẩm thật đã sync để tạo landing page.");
  const [toast, setToast] = useState("");
  const [loading, setLoading] = useState(false);
  const selectedTemplate = useMemo(
    () => templates.find((template) => template.id === templateId) ?? templates[0],
    [templateId, templates]
  );

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 3000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  function showResult(message: string) {
    setStatus(message);
    setToast(message);
  }

  async function createPage() {
    if (!selectedProduct) {
      showResult("Cần chọn sản phẩm thật đã sync trước khi tạo landing page.");
      return;
    }
    setLoading(true);
    const response = await fetch("/api/landing-pages", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ productSku: selectedProduct.sku, templateId, createAiImages })
    });
    const payload = (await response.json().catch(() => null)) as ApiEnvelope<LandingPage> | null;
    if (response.ok && payload?.success) {
      setPages((current) => [payload.data, ...current.filter((page) => page.id !== payload.data.id)]);
      const imageMessage = payload.data.imageJobQueued
        ? " Đã xếp job ảnh AI 4:5, mở Cầu nối ảnh AI để local ImageFlow render và upload ảnh."
        : payload.data.imageJobError
          ? ` Chưa xếp được job ảnh AI: ${payload.data.imageJobError}`
          : "";
      const copyMessage = payload.data.aiMode === "ai"
        ? ` Copy đã tạo bằng AI thật. ${payload.data.aiNotice ?? ""}`
        : payload.data.aiNotice
          ? ` Copy dùng template fallback: ${payload.data.aiNotice}`
          : "";
      showResult(`Đã tạo landing page nháp: ${payload.data.title}.${copyMessage}${imageMessage}`);
    } else {
      showResult(payload && !payload.success ? payload.error ?? "Tạo landing page lỗi." : "Tạo landing page lỗi.");
    }
    setLoading(false);
  }

  async function updateStatus(page: LandingPage, nextStatus: "draft" | "published" | "archived") {
    setLoading(true);
    const response = await fetch(`/api/landing-pages/${encodeURIComponent(page.id)}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: nextStatus })
    });
    const payload = (await response.json().catch(() => null)) as ApiEnvelope<{ pages: LandingPage[] }> | null;
    if (response.ok && payload?.success) {
      setPages(payload.data.pages);
      showResult(nextStatus === "published" ? `Đã publish ${page.title}.` : `Đã chuyển ${page.title} về ${statusLabel(nextStatus)}.`);
    } else {
      showResult(payload && !payload.success ? payload.error ?? "Cập nhật landing page lỗi." : "Cập nhật landing page lỗi.");
    }
    setLoading(false);
  }

  return (
    <div>
      <PageHeader
        title="Landing Page"
        subtitle="Tạo trang bán hàng mobile-first từ sản phẩm thật đã sync, sẵn sàng gắn Pixel/CAPI và mở rộng A/B testing."
        action={
          <button
            type="button"
            onClick={() => void createPage()}
            disabled={loading}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 text-sm font-bold text-white focus-ring disabled:cursor-not-allowed disabled:opacity-60"
          >
            <WandSparkles className="h-4 w-4" aria-hidden="true" />
            {loading ? "Đang xử lý..." : "Tạo landing page"}
          </button>
        }
      />

      <section className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <LayoutTemplate className="h-5 w-5 text-brand-600" aria-hidden="true" />
            <h2 className="text-sm font-bold text-slate-950">Tạo mẫu từ sản phẩm thật</h2>
          </div>
          <div className="mt-4">
            <ProductSearchPicker
              label="Sản phẩm đưa lên landing page"
              selectedSku={selectedProduct?.sku}
              initialProducts={products}
              onSelect={setSelectedProduct}
            />
          </div>
          <label className="mt-4 flex items-start gap-3 rounded-lg border border-sky-100 bg-sky-50 p-3 text-sm leading-6 text-slate-700">
            <input
              type="checkbox"
              checked={createAiImages}
              onChange={(event) => setCreateAiImages(event.target.checked)}
              className="mt-1 h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
            />
            <span>
              <span className="block font-bold text-slate-950">Tạo ảnh AI bằng ImageFlow</span>
              CRM sẽ tạo job 4:5 từ ảnh, mô tả và promptAssets thật của sản phẩm. Local ImageFlow render xong thì public landing page tự ưu tiên ảnh AI cho hero và gallery.
            </span>
          </label>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {templates.map((template) => (
              <button
                key={template.id}
                type="button"
                onClick={() => setTemplateId(template.id)}
                className={[
                  "rounded-lg border p-3 text-left transition focus-ring",
                  templateId === template.id ? "border-brand-300 bg-brand-50" : "border-slate-200 bg-white hover:bg-slate-50"
                ].join(" ")}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="h-4 w-4 rounded-full ring-1 ring-black/10" style={{ backgroundColor: template.accent }} />
                    <div className="font-bold text-slate-950">{template.name}</div>
                  </div>
                  {templateId === template.id ? <StatusPill tone="info">Đang chọn</StatusPill> : null}
                </div>
                <p className="mt-1 text-sm leading-6 text-slate-600">{template.description}</p>
                <p className="mt-1 text-xs text-slate-500">{template.bestFor}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {template.conversionBlocks.slice(0, 3).map((block) => (
                    <span key={block} className="rounded-md bg-slate-100 px-2 py-1 text-[11px] font-bold text-slate-600">
                      {block}
                    </span>
                  ))}
                </div>
              </button>
            ))}
          </div>
          {selectedTemplate ? (
            <section className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center gap-2">
                <Images className="h-5 w-5 text-brand-600" aria-hidden="true" />
                <h3 className="text-sm font-bold text-slate-950">Storyboard CDP: {selectedTemplate.name}</h3>
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-600">{selectedTemplate.copyAngle}</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {selectedTemplate.imageSlots.map((slot) => (
                  <div key={slot.index} className="rounded-lg bg-white p-3 ring-1 ring-slate-200">
                    <div className="text-xs font-bold text-slate-950">{slot.index + 1}. {slot.label}</div>
                    <div className="mt-1 text-[11px] text-slate-500">{slot.width}x{slot.height} · {slot.ratio}</div>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-xs leading-5 text-amber-800">
                Giảm giá, lượt bán, đánh giá, đếm ngược và lời chứng thực vẫn được giữ để tăng chuyển đổi, nhưng chỉ hiển thị khi Product Core, CRM hoặc chiến dịch có dữ liệu thật.
              </p>
            </section>
          ) : null}
          <div className="mt-4 rounded-lg bg-slate-50 p-3 text-sm leading-6 text-slate-600">
            {status}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-slate-950">Landing pages đã tạo</h2>
              <p className="mt-1 text-sm text-slate-600">Publish xong có thể dùng URL này cho quảng cáo Facebook.</p>
            </div>
            <StatusPill tone="neutral">{pages.length} trang</StatusPill>
          </div>

          <div className="mt-4 grid gap-3">
            {pages.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
                Chưa có landing page. Hãy chọn sản phẩm và tạo mẫu đầu tiên.
              </div>
            ) : null}
            {pages.map((page) => (
              <article key={page.id} className="rounded-lg border border-slate-200 p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="break-words text-sm font-bold text-slate-950">{page.title}</h3>
                      <StatusPill tone={page.status === "published" ? "success" : "warning"}>
                        {statusLabel(page.status)}
                      </StatusPill>
                      <StatusPill tone={page.creativeImages.length > 0 ? "success" : page.imageJobError ? "danger" : "info"}>
                        {imageStatusLabel(page)}
                      </StatusPill>
                      <StatusPill tone={page.aiMode === "ai" ? "success" : "neutral"}>
                        {copyStatusLabel(page)}
                      </StatusPill>
                    </div>
                    <p className="mt-1 break-all text-xs text-slate-500">{page.publicUrl}</p>
                    <p className="mt-2 text-sm text-slate-600">
                      SKU {page.productSku} · {page.metrics?.views ?? 0} view · {page.metrics?.leads ?? 0} lead
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {page.status !== "published" ? (
                      <button
                        type="button"
                        onClick={() => void updateStatus(page, "published")}
                        disabled={loading}
                        className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-emerald-600 px-3 text-sm font-bold text-white focus-ring disabled:opacity-60"
                      >
                        <Rocket className="h-4 w-4" aria-hidden="true" />
                        Publish
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => void updateStatus(page, "draft")}
                        disabled={loading}
                        className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-bold text-slate-700 focus-ring disabled:opacity-60"
                      >
                        Về nháp
                      </button>
                    )}
                    <Link
                      href={`/lp/${page.slug}`}
                      target="_blank"
                      className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-bold text-slate-700 focus-ring"
                    >
                      <ExternalLink className="h-4 w-4" aria-hidden="true" />
                      Mở
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mt-4 rounded-xl bg-[#08111f] p-5 text-white shadow-soft">
        <div className="flex items-start gap-3">
          <Send className="mt-1 h-5 w-5 text-sky-200" aria-hidden="true" />
          <div>
            <h2 className="text-base font-bold">Kết nối Ads + Pixel/CAPI</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
              Landing page public tự ghi PageView, ViewContent, Lead và Contact vào D1. Nếu Pixel/CAPI đã cấu hình, trình duyệt gửi Pixel và server gửi CAPI cùng event_id để Meta dedup.
            </p>
          </div>
        </div>
      </section>

      {toast ? (
        <div className="fixed bottom-5 right-5 z-[999] max-w-sm rounded-xl border border-emerald-200 bg-white px-4 py-3 text-sm font-semibold text-emerald-700 shadow-soft">
          {toast}
        </div>
      ) : null}
    </div>
  );
}
