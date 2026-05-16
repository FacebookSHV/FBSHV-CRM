import { MetricCard } from "@/components/ui/metric-card";
import { StatusPill } from "@/components/ui/status-pill";
import type { ProductWithInventory } from "@/lib/ecommerce/types";
import { formatMoney } from "@/lib/money";
import { PageHeader } from "../pages/page-header";

type OverviewContentProps = {
  metrics: Array<{ label: string; value: string; helper: string }>;
  products: ProductWithInventory[];
};

export function OverviewContent({ metrics, products }: OverviewContentProps) {
  return (
    <div>
      <PageHeader
        title="Tổng quan"
        subtitle="Bảng điều khiển CRM Facebook, đơn hàng và đồng bộ sản phẩm từ Web Quản Lý TMĐT."
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <MetricCard key={metric.label} {...metric} />
        ))}
      </div>
      <div className="mt-5 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-md border border-slate-200 bg-white shadow-soft">
          <div className="border-b border-slate-200 px-4 py-3">
            <h2 className="text-sm font-semibold text-ink">
              Sản phẩm cần chú ý
            </h2>
          </div>
          <div className="divide-y divide-slate-100">
            {products.length === 0 ? (
              <div className="p-4 text-sm text-slate-600">Chưa lấy được sản phẩm thật từ Web Quản Lý TMĐT.</div>
            ) : null}
            {products.map((product) => (
              <article
                key={product.id}
                className="grid gap-3 p-4 sm:grid-cols-[1fr_auto] sm:items-center"
              >
                <div>
                  <div className="font-medium text-ink">{product.name}</div>
                  <div className="mt-1 text-sm text-slate-500">
                    SKU {product.sku} · Tồn khả dụng {product.availableStock}
                  </div>
                </div>
                <div className="flex items-center gap-2 sm:justify-end">
                  <StatusPill
                    tone={product.availableStock <= product.lowStockThreshold ? "warning" : "success"}
                  >
                    {product.availableStock <= product.lowStockThreshold
                      ? "Sắp hết"
                      : "Ổn định"}
                  </StatusPill>
                  <span className="text-sm font-semibold text-ink">
                    {formatMoney(product.currentPrice)}
                  </span>
                </div>
              </article>
            ))}
          </div>
        </section>
        <section className="rounded-md border border-slate-200 bg-white p-4 shadow-soft">
          <h2 className="text-sm font-semibold text-ink">Quy tắc an toàn</h2>
          <div className="mt-3 space-y-3 text-sm leading-6 text-slate-600">
            <p>
              CRM chỉ cache dữ liệu sản phẩm và gọi API ngoài để kiểm giá, giữ
              hàng hoặc tạo đơn.
            </p>
            <p>
              Tồn kho local không bị trừ nếu Web Quản Lý TMĐT chưa phản hồi
              thành công.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
