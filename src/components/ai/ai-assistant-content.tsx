"use client";

import { Sparkles } from "lucide-react";
import { useState } from "react";
import type { ProductWithInventory } from "@/lib/ecommerce/types";

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
  const selected = products.find((product) => product.sku === sku);

  function generate() {
    if (!selected) return;
    setResult(
      `Dạ shop hỗ trợ mình mẫu ${selected.name}. Sản phẩm hiện có giá ${selected.currentPrice.toLocaleString("vi-VN")}đ, tồn kho đang sẵn để shop kiểm tra và chốt đơn nhanh. ${templates[mode]}`
    );
  }

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-2xl font-semibold text-ink">AI Assistant</h1>
        <p className="mt-1 text-sm leading-6 text-slate-600">
          Tạo nội dung tư vấn, caption ads và kịch bản inbox từ ProductCache.
        </p>
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
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-brand-600 px-4 text-sm font-semibold text-white focus-ring hover:bg-brand-700"
            >
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              Tạo bản nháp
            </button>
          </div>
        </section>
        <section className="rounded-md border border-slate-200 bg-white p-4 shadow-soft">
          <h2 className="text-sm font-semibold text-ink">Kết quả mock</h2>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">{result}</p>
          <p className="mt-4 text-xs leading-5 text-slate-500">
            Nếu thiếu OPENAI_API_KEY, app dùng mock response tiếng Việt và không làm fail build.
          </p>
        </section>
      </div>
    </div>
  );
}
