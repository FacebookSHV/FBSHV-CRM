import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { StatusPill } from "@/components/ui/status-pill";
import type { ProductWithInventory } from "@/lib/ecommerce/types";
import { formatMoney } from "@/lib/money";

export function ProductDetail({ product }: { product: ProductWithInventory }) {
  return (
    <div>
      <Link
        href="/products"
        className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-brand-700"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Quay lại sản phẩm
      </Link>
      <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-md border border-slate-200 bg-white p-4 shadow-soft">
          <StatusPill tone={product.status === "active" ? "success" : "warning"}>
            {product.status === "active" ? "Đang bán" : "Cần chú ý"}
          </StatusPill>
          <h1 className="mt-3 text-2xl font-semibold text-ink">{product.name}</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">{product.description}</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <Info label="SKU" value={product.sku} />
            <Info label="Danh mục" value={product.category} />
            <Info label="Giá hiện tại" value={formatMoney(product.currentPrice)} />
            <Info label="Giá khuyến mãi" value={formatMoney(product.salePrice)} />
          </div>
        </div>
        <div className="rounded-md border border-slate-200 bg-white p-4 shadow-soft">
          <h2 className="text-sm font-semibold text-ink">Tồn kho cache</h2>
          <div className="mt-4 grid grid-cols-3 gap-3 text-center">
            <Info label="Tổng" value={String(product.stock)} />
            <Info label="Khả dụng" value={String(product.availableStock)} />
            <Info label="Đang giữ" value={String(product.reservedStock)} />
          </div>
          <p className="mt-4 text-sm leading-6 text-slate-600">
            CRM chỉ hiển thị cache. Khi tạo đơn, hệ thống vẫn gọi Web Quản Lý TMĐT
            để kiểm tồn realtime trước.
          </p>
        </div>
      </section>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-slate-50 p-3">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="mt-1 break-words text-sm font-semibold text-ink">{value}</div>
    </div>
  );
}
