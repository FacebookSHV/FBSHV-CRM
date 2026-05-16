"use client";

import { Sparkles } from "lucide-react";
import { useState } from "react";
import type { ProductWithInventory } from "@/lib/ecommerce/types";
import { StatusPill } from "@/components/ui/status-pill";

type AiAssistantContentProps = {
  products: ProductWithInventory[];
};

const templates = {
  caption: "Viết caption quảng cáo ngắn, nêu lợi ích chính và lời kêu gọi nhắn tin.",
  inbox: "Soạn câu trả lời tư vấn thân thiện, hỏi thêm nhu cầu nếu thiếu thông tin.",
  script: "Tạo kịch bản inbox chốt đơn theo từng bước ngắn gọn."
};

export function AiAssistantContent({ products }: AiAssistantContentProps) {
  const [sku, setSku] = useState(products[0]?.sku ?? "");
  const [mode, setMode] = useState<keyof typeof templates>("caption");
  const [result, setResult] = useState("Chọn sản phẩm và loại nội dung để tạo bản nháp.");
  const [notice, setNotice] = useState("AI chưa gọi.");
  const [loading, setLoading] = useState(false);
  const selected = products.find((product) => product.sku === sku);

  async function generate() {
    if (!selected) {
      setNotice("Chưa có sản phẩm thật để tạo nội dung.");
      return;
    }
    setLoading(true);
    const response = await fetch("/api/ai/generate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ task: mode, productSku: selected.sku, prompt: templates[mode] })
    });
    const payload = (await response.json().catch(() => null)) as
      | { success: true; data: { mode: "ai" | "template"; provider: string; text: string; notice?: string } }
      | { success: false; error?: string }
      | null;
    if (response.ok && payload?.success) {
      setResult(payload.data.text);
      setNotice(payload.data.notice || `AI thật: ${payload.data.provider}`);
    } else {
      setNotice(payload && !payload.success ? payload.error ?? "Tạo nội dung lỗi." : "Tạo nội dung lỗi.");
    }
    setLoading(false);
  }

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-2xl font-semibold text-ink">AI Assistant</h1>
        <p className="mt-1 text-sm leading-6 text-slate-600">
          Tạo nội dung tư vấn, caption và kịch bản video từ sản phẩm thật.
        </p>
      </div>
      <div className="mb-4">
        <StatusPill tone={notice.includes("thật") ? "success" : "warning"}>{notice}</StatusPill>
      </div>
      <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <section className="rounded-md border border-slate-200 bg-white p-4 shadow-soft">
          <div className="grid gap-3">
            <label>
              <span className="text-sm font-medium text-slate-700">Sản phẩm</span>
              <select
                value={sku}
                onChange={(event) => setSku(event.target.value)}
                className="mt-1 min-h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-sm focus-ring"
              >
                {products.map((product) => (
                  <option key={product.sku} value={product.sku}>
                    {product.name}
                  </option>
                ))}
              </select>
            </label>
            <div>
              <span className="text-sm font-medium text-slate-700">Loại nội dung</span>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {Object.keys(templates).map((key) => (
                  <button
                    type="button"
                    key={key}
                    onClick={() => setMode(key as keyof typeof templates)}
                    className={[
                      "min-h-10 rounded-md border px-2 text-sm font-medium focus-ring",
                      mode === key
                        ? "border-brand-600 bg-brand-50 text-brand-700"
                        : "border-slate-200 text-slate-600"
                    ].join(" ")}
                  >
                    {key === "caption" ? "Caption" : key === "inbox" ? "Tư vấn" : "Kịch bản"}
                  </button>
                ))}
              </div>
            </div>
            <button
              type="button"
              onClick={generate}
              disabled={loading || products.length === 0}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-brand-600 px-4 text-sm font-semibold text-white focus-ring hover:bg-brand-700"
            >
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              {loading ? "Đang tạo" : "Tạo bản nháp"}
            </button>
          </div>
        </section>
        <section className="rounded-md border border-slate-200 bg-white p-4 shadow-soft">
          <h2 className="text-sm font-semibold text-ink">Kết quả</h2>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">{result}</p>
          <p className="mt-4 text-xs leading-5 text-slate-500">
            Nếu thiếu GEMINI_API_KEY hoặc OPENAI_API_KEY, hệ thống ghi rõ đang dùng template fallback.
          </p>
        </section>
      </div>
    </div>
  );
}
