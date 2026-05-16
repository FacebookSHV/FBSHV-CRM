"use client";

import { Search, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { ProductWithInventory } from "@/lib/ecommerce/types";
import { formatMoney } from "@/lib/money";

type ProductSearchPickerProps = {
  label?: string;
  selectedSku?: string;
  initialProducts?: ProductWithInventory[];
  onSelect: (product: ProductWithInventory | null) => void;
};

type ApiEnvelope<T> = { success: true; data: T } | { success: false; error?: string };

function productText(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function productNumber(value: unknown, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

export function ProductSearchPicker({
  label = "Sản phẩm",
  selectedSku,
  initialProducts = [],
  onSelect
}: ProductSearchPickerProps) {
  const [query, setQuery] = useState("");
  const [products, setProducts] = useState<ProductWithInventory[]>(Array.isArray(initialProducts) ? initialProducts : []);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(
    initialProducts.length
      ? "Danh sách sản phẩm thật đã tải từ D1 cache."
      : "Chưa có sản phẩm đã sync trong D1. Hãy bấm Đồng bộ ở trang Sản phẩm trước."
  );

  const selected = useMemo(
    () => products.find((product) => product.sku === selectedSku) ?? null,
    [products, selectedSku]
  );

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      const params = new URLSearchParams({ limit: "8" });
      if (query.trim()) params.set("q", query.trim());
      // NEO: Product picker dùng API cache D1 đã sync, không dùng danh sách demo hoặc state tạm.
      const response = await fetch(`/api/products/search?${params}`, {
        cache: "no-store",
        signal: controller.signal
      }).catch(() => null);
      if (!response) {
        setLoading(false);
        return;
      }
      const payload = (await response.json().catch(() => null)) as ApiEnvelope<ProductWithInventory[]> | null;
      if (response.ok && payload?.success) {
        setProducts(payload.data);
        setStatus(payload.data.length ? "Danh sách sản phẩm thật đã tải từ D1 cache." : "Không tìm thấy sản phẩm đã sync phù hợp.");
      } else {
        setStatus(payload && !payload.success ? payload.error ?? "Không tải được sản phẩm đã sync." : "Không tải được sản phẩm đã sync.");
      }
      setLoading(false);
    }, 250);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [query]);

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <label className="text-sm font-medium text-slate-700" htmlFor="product-search">
          {label}
        </label>
        {selected ? (
          <button
            type="button"
            onClick={() => onSelect(null)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-slate-600 focus-ring"
            aria-label="Bỏ chọn sản phẩm"
            title="Bỏ chọn sản phẩm"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        ) : null}
      </div>
      <div className="mt-1 flex min-h-11 items-center gap-2 rounded-md border border-slate-200 px-3">
        <Search className="h-4 w-4 text-slate-400" aria-hidden="true" />
        <input
          id="product-search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Tìm tên sản phẩm hoặc SKU"
          className="w-full border-0 bg-transparent text-sm outline-none"
        />
      </div>

      <div className="mt-2 text-xs text-slate-500">{loading ? "Đang tải sản phẩm..." : status}</div>

      {selected ? (
        <div className="mt-3 rounded-md border border-brand-200 bg-brand-50 p-3">
          <div className="text-sm font-semibold text-brand-800">{selected.name}</div>
          <div className="mt-1 text-xs text-brand-700">SKU {selected.sku}</div>
        </div>
      ) : null}

      <div className="mt-3 grid max-h-72 gap-2 overflow-y-auto pr-1">
        {products.map((product) => (
          <button
            type="button"
            key={productText(product.id, product.sku)}
            onClick={() => onSelect(product)}
            className={[
              "grid grid-cols-[52px_1fr] gap-3 rounded-md border p-2 text-left focus-ring",
              selectedSku === product.sku ? "border-brand-300 bg-brand-50" : "border-slate-200 bg-white hover:bg-slate-50"
            ].join(" ")}
          >
            <div className="h-[52px] w-[52px] overflow-hidden rounded-md bg-slate-100">
              {product.imageUrl ? (
                // NEO: Product picker chỉ đọc ảnh từ nguồn TMĐT đã sync, không tự tạo dữ liệu sản phẩm trong CRM.
                // eslint-disable-next-line @next/next/no-img-element
                <img src={product.imageUrl} alt="" className="h-full w-full object-cover" />
              ) : null}
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-ink">{productText(product.name, "Chưa có tên")}</div>
              <div className="mt-1 text-xs text-slate-500">SKU {productText(product.sku, "chưa có")}</div>
              <div className="mt-1 text-xs text-slate-500">
                {formatMoney(productNumber(product.currentPrice), product.currency)} · còn {productNumber(product.availableStock)}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
