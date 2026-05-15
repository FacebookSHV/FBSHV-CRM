"use client";

import { ClipboardCheck, PackageCheck, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { StatusPill } from "@/components/ui/status-pill";
import type { ProductWithInventory } from "@/lib/ecommerce/types";
import { formatMoney } from "@/lib/money";

type OrderBuilderProps = {
  products: ProductWithInventory[];
};

type StepMessage = {
  text: string;
  tone: "success" | "warning" | "danger" | "info" | "neutral";
};

type ApiEnvelope<T> =
  | { success: true; data: T }
  | { success: false; error?: string };

function isEnvelope<T>(value: unknown): value is ApiEnvelope<T> {
  return typeof value === "object" && value !== null && "success" in value;
}

export function OrderBuilder({ products }: OrderBuilderProps) {
  const [sku, setSku] = useState(products[0]?.sku ?? "");
  const [quantity, setQuantity] = useState(1);
  const [message, setMessage] = useState<StepMessage>({
    text: "Chọn SKU từ ProductCache rồi kiểm tồn trước khi tạo đơn.",
    tone: "info"
  });
  const [loading, setLoading] = useState(false);
  const selected = products.find((product) => product.sku === sku);

  async function postJson(url: string, body: unknown) {
    const response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body)
    });
    const payload = (await response.json().catch(() => null)) as unknown;
    return { response, payload };
  }

  async function checkInventory() {
    setLoading(true);
    const { response, payload } = await postJson("/api/ecommerce/inventory/check", {
      sku,
      quantity
    });
    if (response.ok && isEnvelope<{ availableStock: number; enoughStock: boolean }>(payload) && payload.success) {
      setMessage({
        text: `Tồn khả dụng ${payload.data.availableStock}, ${payload.data.enoughStock ? "đủ" : "không đủ"} để chốt.`,
        tone: payload.data.enoughStock ? "success" : "warning"
      });
    } else {
      const error = isEnvelope<unknown>(payload) && !payload.success ? payload.error : undefined;
      setMessage({ text: error ?? "Kiểm tồn thất bại", tone: "danger" });
    }
    setLoading(false);
  }

  async function createOrder() {
    setLoading(true);
    const { response, payload } = await postJson("/api/ecommerce/orders/from-facebook", {
      customerId: "customer-demo",
      conversationId: "conversation-demo",
      sku,
      quantity,
      note: "Đơn tạo từ khung CRM Facebook"
    });
    setMessage(
      response.ok && isEnvelope<{ externalOrderId: string }>(payload) && payload.success
        ? {
            text: `Đã tạo đơn ngoài ${payload.data.externalOrderId}; CRM không tự trừ tồn local.`,
            tone: "success"
          }
        : {
            text:
              isEnvelope<unknown>(payload) && !payload.success
                ? payload.error ?? "Tạo đơn thất bại"
                : "Tạo đơn thất bại",
            tone: "danger"
          }
    );
    setLoading(false);
  }

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-2xl font-semibold text-ink">Đơn hàng</h1>
        <p className="mt-1 text-sm leading-6 text-slate-600">
          Tạo đơn từ hội thoại Facebook theo quy tắc kiểm tồn realtime trước.
        </p>
      </div>
      <div className="grid gap-4 lg:grid-cols-[1fr_0.9fr]">
        <section className="rounded-md border border-slate-200 bg-white p-4 shadow-soft">
          <h2 className="text-sm font-semibold text-ink">Tạo đơn từ hội thoại</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Sản phẩm</span>
              <select
                value={sku}
                onChange={(event) => setSku(event.target.value)}
                className="mt-1 min-h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-sm focus-ring"
              >
                {products.map((product) => (
                  <option key={product.sku} value={product.sku}>
                    {product.name} · {product.sku}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Số lượng</span>
              <input
                type="number"
                min={1}
                value={quantity}
                onChange={(event) => setQuantity(Number(event.target.value))}
                className="mt-1 min-h-11 w-full rounded-md border border-slate-200 px-3 text-sm focus-ring"
              />
            </label>
          </div>
          {selected ? (
            <div className="mt-4 grid gap-3 rounded-md bg-slate-50 p-3 text-sm sm:grid-cols-3">
              <Info label="Giá" value={formatMoney(selected.currentPrice)} />
              <Info label="Tồn cache" value={String(selected.availableStock)} />
              <Info label="Trạng thái" value={selected.status === "active" ? "Đang bán" : "Cần chú ý"} />
            </div>
          ) : null}
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              disabled={loading}
              onClick={checkInventory}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-slate-200 px-4 text-sm font-semibold text-slate-700 focus-ring hover:bg-slate-50"
            >
              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
              Kiểm tồn realtime
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={createOrder}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-brand-600 px-4 text-sm font-semibold text-white focus-ring hover:bg-brand-700"
            >
              <PackageCheck className="h-4 w-4" aria-hidden="true" />
              Tạo đơn ngoài
            </button>
          </div>
          <div className="mt-4">
            <StatusPill tone={message.tone}>{message.text}</StatusPill>
          </div>
        </section>
        <section className="rounded-md border border-slate-200 bg-white p-4 shadow-soft">
          <ClipboardCheck className="h-8 w-8 text-brand-600" aria-hidden="true" />
          <h2 className="mt-3 text-sm font-semibold text-ink">Luồng an toàn</h2>
          <ol className="mt-3 space-y-3 text-sm leading-6 text-slate-600">
            <li>1. Chọn khách hàng/hội thoại và sản phẩm cache.</li>
            <li>2. Gọi API kiểm tồn realtime từ Web Quản Lý TMĐT.</li>
            <li>3. Chỉ giữ hàng/tạo đơn khi API ngoài xác nhận thành công.</li>
          </ol>
        </section>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-slate-500">{label}</div>
      <div className="mt-1 break-words font-semibold text-ink">{value}</div>
    </div>
  );
}
