"use client";

import Link from "next/link";
import { RefreshCw, Search, ShieldCheck, Tag } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { StatusPill } from "@/components/ui/status-pill";
import type { ProductSyncSummary, ProductWithInventory } from "@/lib/ecommerce/types";
import { formatMoney } from "@/lib/money";

type ProductsContentProps = {
  initialProducts: ProductWithInventory[];
  initialSyncSummary?: ProductSyncSummary;
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

function productText(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function productNumber(value: unknown, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function formatDateTime(value?: string | null) {
  return value ? new Date(value).toLocaleString("vi-VN") : "chưa có";
}

export function ProductsContent({ initialProducts, initialSyncSummary }: ProductsContentProps) {
  const [products, setProducts] = useState(Array.isArray(initialProducts) ? initialProducts : []);
  const [query, setQuery] = useState("");
  const [syncSummary, setSyncSummary] = useState<ProductSyncSummary>(
    initialSyncSummary ?? { lastSyncedAt: null, syncedCount: 0, status: null, error: null }
  );
  const [actionState, setActionState] = useState<ActionState>({
    message: initialProducts.length
      ? "Đang dùng dữ liệu sản phẩm đã sync và lưu bền trong D1."
      : "Chưa có sản phẩm đã sync trong D1. Bấm Đồng bộ để lấy từ Web Quản Lý TMĐT.",
    tone: "info"
  });
  const [loadingSku, setLoadingSku] = useState<string | null>(null);

  const visibleProducts = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return products;
    return products.filter(
      (product) =>
        productText(product.name).toLowerCase().includes(normalized) ||
        productText(product.sku).toLowerCase().includes(normalized)
    );
  }, [products, query]);

  async function reloadProducts() {
    const productsResponse = await fetch("/api/products", { cache: "no-store" });
    const productsPayload = (await productsResponse.json().catch(() => null)) as unknown;
    if (isEnvelope<ProductWithInventory[]>(productsPayload) && productsPayload.success) {
      setProducts(productsPayload.data);
    }
  }

  async function syncProducts() {
    setLoadingSku("sync");
    const response = await fetch("/api/products/sync", { method: "POST" });
    const payload = await readEnvelope<{ synced: number; cached?: number; source: string; d1?: boolean; lastSyncedAt?: string | null }>(response);
    if (response.ok && payload?.success) {
      setSyncSummary({
        lastSyncedAt: payload.data.lastSyncedAt ?? new Date().toISOString(),
        syncedCount: payload.data.synced,
        status: "success",
        error: null
      });
      setActionState({
        message: `Đã đồng bộ ${payload.data.synced} sản phẩm từ Web TMĐT${payload.data.d1 ? " và upsert vào D1" : ""}.`,
        tone: "success"
      });
      await reloadProducts();
    } else {
      setActionState({
        message: payload && !payload.success ? payload.error ?? "Đồng bộ thất bại, dữ liệu cũ vẫn được giữ." : "Đồng bộ thất bại, dữ liệu cũ vẫn được giữ.",
        tone: "danger"
      });
    }
    setLoadingSku(null);
  }

  async function checkPrice(sku: string) {
    setLoadingSku(sku);
    const product = products.find((item) => productText(item.sku) === sku);
    const productId = productText(product?.id, sku);
    const response = await fetch(`/api/products/${encodeURIComponent(productId)}/check-price`, { method: "POST" });
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
    const product = products.find((item) => productText(item.sku) === sku);
    const productId = productText(product?.id, sku);
    const response = await fetch(`/api/products/${encodeURIComponent(productId)}/check-stock`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ quantity: 1 })
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
          <p className="mt-1 text-xs text-slate-500">
            Last synced: {formatDateTime(syncSummary.lastSyncedAt)} · synced_count: {syncSummary.syncedCount}
          </p>
        </div>
        <button
          type="button"
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-brand-600 px-4 text-sm font-semibold text-white focus-ring hover:bg-brand-700"
          onClick={() => void syncProducts()}
          disabled={loadingSku === "sync"}
        >
          <RefreshCw className={["h-4 w-4", loadingSku === "sync" ? "animate-spin" : ""].join(" ")} aria-hidden="true" />
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
        {visibleProducts.length === 0 ? <EmptyProducts /> : null}
        {visibleProducts.map((product) => (
          <ProductCard
            key={productText(product.id, productText(product.sku))}
            product={product}
            loading={loadingSku === productText(product.sku)}
            onPrice={() => void checkPrice(productText(product.sku))}
            onInventory={() => void checkInventory(productText(product.sku))}
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
            {visibleProducts.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8">
                  <EmptyProducts />
                </td>
              </tr>
            ) : null}
            {visibleProducts.map((product) => (
              <tr key={productText(product.id, productText(product.sku))}>
                <td className="px-4 py-3">
                  <Link href={`/products/${encodeURIComponent(productText(product.id, productText(product.sku)))}`} className="font-semibold text-ink hover:text-brand-700">
                    {productText(product.name, "Chưa có tên sản phẩm")}
                  </Link>
                  <div className="text-xs text-slate-500">SKU {productText(product.sku, "chưa có")}</div>
                  <div className="text-xs text-slate-500">Sync: {formatDateTime(product.syncedAt)}</div>
                </td>
                <td className="px-4 py-3">{formatMoney(product.currentPrice, product.currency)}</td>
                <td className="px-4 py-3">
                  {productNumber(product.availableStock)}/{productNumber(product.stock)}
                </td>
                <td className="px-4 py-3">
                  <ProductStatus product={product} />
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <ActionButton icon={<Tag />} label="Kiểm giá" onClick={() => void checkPrice(productText(product.sku))} />
                    <ActionButton icon={<ShieldCheck />} label="Kiểm tồn" onClick={() => void checkInventory(productText(product.sku))} />
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
  if (product.status === "inactive" || product.missingFromSource) return <StatusPill tone="neutral">Ngưng bán</StatusPill>;
  if (productNumber(product.availableStock) <= productNumber(product.lowStockThreshold, 10)) return <StatusPill tone="warning">Tồn thấp</StatusPill>;
  return <StatusPill tone="success">Đang bán</StatusPill>;
}

type ProductActionProps = {
  icon: ReactNode;
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
          <Link href={`/products/${encodeURIComponent(productText(product.id, productText(product.sku)))}`} className="font-semibold text-ink">
            {productText(product.name, "Chưa có tên sản phẩm")}
          </Link>
          <div className="mt-1 text-xs text-slate-500">SKU {productText(product.sku, "chưa có")}</div>
          <div className="mt-1 text-xs text-slate-500">Sync: {formatDateTime(product.syncedAt)}</div>
        </div>
        <ProductStatus product={product} />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-md bg-slate-50 p-3">
          <div className="text-xs text-slate-500">Giá hiện tại</div>
          <div className="mt-1 font-semibold text-ink">{formatMoney(product.currentPrice, product.currency)}</div>
        </div>
        <div className="rounded-md bg-slate-50 p-3">
          <div className="text-xs text-slate-500">Tồn khả dụng</div>
          <div className="mt-1 font-semibold text-ink">{productNumber(product.availableStock)}</div>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <ActionButton icon={<Tag />} label={loading ? "Đang kiểm" : "Kiểm giá"} onClick={onPrice} />
        <ActionButton icon={<ShieldCheck />} label="Kiểm tồn" onClick={onInventory} />
      </div>
    </article>
  );
}

function EmptyProducts() {
  return (
    <div className="rounded-md border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
      Chưa có sản phẩm trong D1 cache. Bấm Đồng bộ để lấy dữ liệu thật từ Web Quản Lý TMĐT; nếu API nguồn lỗi, danh sách cũ sẽ không bị xoá.
    </div>
  );
}
