"use client";

import Link from "next/link";
import { RefreshCw, Search, ShieldCheck, Tag } from "lucide-react";
import { useMemo, useState } from "react";
import { StatusPill } from "@/components/ui/status-pill";
import type { ProductWithInventory } from "@/lib/ecommerce/types";
import { formatMoney } from "@/lib/money";

type ProductsContentProps = {
  initialProducts: ProductWithInventory[];
};

type ActionState = {
  message: string;
  tone: "success" | "warning" | "danger" | "info" | "neutral";
};

type ApiEnvelope<T> =
  | { success: true; data: T }
  | { success: false; error?: string };

function isEnvelope<T>(value: unknown): value is ApiEnvelope<T> {
  return typeof value === "object" && value !== null && "success" in value;
}

async function readEnvelope<T>(response: Response): Promise<ApiEnvelope<T> | null> {
  const payload = (await response.json().catch(() => null)) as unknown;
  return isEnvelope<T>(payload) ? payload : null;
}

export function ProductsContent({ initialProducts }: ProductsContentProps) {
  const [products, setProducts] = useState(initialProducts);
  const [query, setQuery] = useState("");
  const [actionState, setActionState] = useState<ActionState>({
    message: "Đang dùng dữ liệu mock an toàn khi thiếu secret TMĐT.",
    tone: "info"
  });
  const [loadingSku, setLoadingSku] = useState<string | null>(null);

  const visibleProducts = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return products;
    return products.filter(
      (product) =>
        product.name.toLowerCase().includes(normalized) ||
        product.sku.toLowerCase().includes(normalized)
    );
  }, [products, query]);

  async function syncProducts() {
    setLoadingSku("sync");
    const response = await fetch("/api/ecommerce/sync-products", { method: "POST" });
    const payload = await readEnvelope<{ synced: number; source: string }>(response);
    if (response.ok && payload?.success) {
      setActionState({
        message: `Đã đồng bộ ${payload.data.synced} sản phẩm từ nguồn ${payload.data.source}.`,
        tone: "success"
      });
      const productsResponse = await fetch("/api/ecommerce/products");
      const productsPayload = (await productsResponse.json().catch(() => null)) as unknown;
      if (isEnvelope<ProductWithInventory[]>(productsPayload) && productsPayload.success) {
        setProducts(productsPayload.data);
      }
    } else {
      setActionState({
        message: payload && !payload.success ? payload.error ?? "Đồng bộ thất bại" : "Đồng bộ thất bại",
        tone: "danger"
      });
    }
    setLoadingSku(null);
  }

  async function checkPrice(sku: string) {
    setLoadingSku(sku);
    const response = await fetch(`/api/ecommerce/products/sku/${encodeURIComponent(sku)}/price`);
    const payload = await readEnvelope<{ price: number; currency: string }>(response);
    setActionState(
      response.ok && payload?.success
        ? {
            message: `Giá hiện tại SKU ${sku}: ${formatMoney(payload.data.price, payload.data.currency)}.`,
            tone: "success"
          }
        : {
            message: payload && !payload.success ? payload.error ?? "Kiểm giá thất bại" : "Kiểm giá thất bại",
            tone: "danger"
          }
    );
    setLoadingSku(null);
  }

  async function checkInventory(sku: string) {
    setLoadingSku(sku);
    const response = await fetch("/api/ecommerce/inventory/check", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ sku, quantity: 1 })
    });
    const payload = await readEnvelope<{ availableStock: number; enoughStock: boolean }>(response);
    setActionState(
      response.ok && payload?.success
        ? {
            message: `SKU ${sku} còn ${payload.data.availableStock}, đủ hàng: ${payload.data.enoughStock ? "có" : "không"}.`,
            tone: payload.data.enoughStock ? "success" : "warning"
          }
        : {
            message: payload && !payload.success ? payload.error ?? "Kiểm tồn thất bại" : "Kiểm tồn thất bại",
            tone: "danger"
          }
    );
    setLoadingSku(null);
  }

  return (
    <div>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Sản phẩm đồng bộ</h1>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            Cache sản phẩm từ Web Quản Lý TMĐT, chỉ kiểm tra giá/tồn qua API ngoài.
          </p>
        </div>
        <button
          type="button"
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-brand-600 px-4 text-sm font-semibold text-white focus-ring hover:bg-brand-700"
          onClick={syncProducts}
          disabled={loadingSku === "sync"}
        >
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          Đồng bộ
        </button>
      </div>
      <div className="mb-4 grid gap-3 rounded-md border border-slate-200 bg-white p-3 shadow-soft sm:grid-cols-[1fr_auto] sm:items-center">
        <label className="flex min-h-11 items-center gap-2 rounded-md border border-slate-200 px-3">
          <Search className="h-4 w-4 text-slate-400" aria-hidden="true" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Tìm tên sản phẩm hoặc SKU"
            className="w-full border-0 bg-transparent text-sm outline-none"
          />
        </label>
        <StatusPill tone={actionState.tone}>{actionState.message}</StatusPill>
      </div>
      <div className="grid gap-3 lg:hidden">
        {visibleProducts.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            loading={loadingSku === product.sku}
            onPrice={() => checkPrice(product.sku)}
            onInventory={() => checkInventory(product.sku)}
          />
        ))}
      </div>
      <div className="hidden overflow-hidden rounded-md border border-slate-200 bg-white shadow-soft lg:block">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Sản phẩm</th>
              <th className="px-4 py-3">Giá</th>
              <th className="px-4 py-3">Tồn kho</th>
              <th className="px-4 py-3">Trạng thái</th>
              <th className="px-4 py-3 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {visibleProducts.map((product) => (
              <tr key={product.id}>
                <td className="px-4 py-3">
                  <Link href={`/products/${product.id}`} className="font-semibold text-ink hover:text-brand-700">
                    {product.name}
                  </Link>
                  <div className="text-xs text-slate-500">SKU {product.sku}</div>
                </td>
                <td className="px-4 py-3">{formatMoney(product.currentPrice)}</td>
                <td className="px-4 py-3">
                  {product.availableStock}/{product.stock}
                </td>
                <td className="px-4 py-3">
                  <ProductStatus product={product} />
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <ActionButton icon={<Tag />} label="Kiểm giá" onClick={() => checkPrice(product.sku)} />
                    <ActionButton icon={<ShieldCheck />} label="Kiểm tồn" onClick={() => checkInventory(product.sku)} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ProductStatus({ product }: { product: ProductWithInventory }) {
  if (product.status === "inactive") return <StatusPill tone="neutral">Ngưng bán</StatusPill>;
  if (product.availableStock <= product.lowStockThreshold) return <StatusPill tone="warning">Tồn thấp</StatusPill>;
  return <StatusPill tone="success">Đang bán</StatusPill>;
}

type ProductActionProps = {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
};

function ActionButton({ icon, label, onClick }: ProductActionProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-slate-200 px-3 text-sm font-medium text-slate-700 focus-ring hover:bg-slate-50"
    >
      <span className="h-4 w-4 [&>svg]:h-4 [&>svg]:w-4" aria-hidden="true">
        {icon}
      </span>
      {label}
    </button>
  );
}

type ProductCardProps = {
  product: ProductWithInventory;
  loading: boolean;
  onPrice: () => void;
  onInventory: () => void;
};

function ProductCard({ product, loading, onPrice, onInventory }: ProductCardProps) {
  return (
    <article className="rounded-md border border-slate-200 bg-white p-4 shadow-soft">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link href={`/products/${product.id}`} className="font-semibold text-ink">
            {product.name}
          </Link>
          <div className="mt-1 text-xs text-slate-500">SKU {product.sku}</div>
        </div>
        <ProductStatus product={product} />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-md bg-slate-50 p-3">
          <div className="text-xs text-slate-500">Giá hiện tại</div>
          <div className="mt-1 font-semibold text-ink">{formatMoney(product.currentPrice)}</div>
        </div>
        <div className="rounded-md bg-slate-50 p-3">
          <div className="text-xs text-slate-500">Tồn khả dụng</div>
          <div className="mt-1 font-semibold text-ink">{product.availableStock}</div>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <ActionButton icon={<Tag />} label={loading ? "Đang kiểm" : "Kiểm giá"} onClick={onPrice} />
        <ActionButton icon={<ShieldCheck />} label="Kiểm tồn" onClick={onInventory} />
      </div>
    </article>
  );
}
