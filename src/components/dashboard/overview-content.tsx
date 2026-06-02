import Link from "next/link";
import { ArrowRight, CalendarDays, Inbox, Megaphone, PackageSearch, ShieldCheck } from "lucide-react";
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
  const lowStockProducts = products.filter((product) => product.availableStock <= product.lowStockThreshold);

  return (
    <div>
      <PageHeader
        title="Tổng quan"
        subtitle="Màn điều phối nhanh để biết hôm nay cần chăm sóc khách, xử lý nội dung, kiểm hàng hay tối ưu quảng cáo."
      />

      <div className="md:hidden">
        <section className="rounded-xl bg-[#08111f] p-4 text-white shadow-soft">
          <div className="text-xs font-bold uppercase tracking-[0.08em] text-sky-200">
            Việc cần làm ngay
          </div>
          <h2 className="mt-2 text-xl font-bold tracking-normal">
            Chọn luồng vận hành trước, xem số liệu sau.
          </h2>
          <div className="mt-4 grid gap-3">
            <QuickAction href="/inbox" icon={<Inbox />} label="Chăm sóc khách" helper="Inbox và bình luận" />
            <QuickAction href="/content-planner" icon={<CalendarDays />} label="Lịch nội dung" helper="Tạo, sửa, đăng bài" />
            <QuickAction href="/ads" icon={<Megaphone />} label="Quảng cáo" helper="Theo dõi và tạo draft" />
          </div>
        </section>

        <section className="mt-4 grid grid-cols-2 gap-3">
          {metrics.map((metric) => (
            <MetricCard key={metric.label} {...metric} />
          ))}
        </section>

        <section className="mt-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-slate-950">SKU cần kiểm</h2>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                {lowStockProducts.length} sản phẩm đang dưới ngưỡng cảnh báo.
              </p>
            </div>
            <StatusPill tone={lowStockProducts.length ? "warning" : "success"}>
              {lowStockProducts.length ? "Cần kiểm" : "Ổn định"}
            </StatusPill>
          </div>
          <div className="mt-3 divide-y divide-slate-100">
            {products.length === 0 ? (
              <div className="py-4 text-sm text-slate-600">Chưa có sản phẩm đã đồng bộ.</div>
            ) : null}
            {products.slice(0, 4).map((product) => (
              <article key={product.id} className="py-3">
                <div className="font-bold text-slate-950">{product.name}</div>
                <div className="mt-1 text-xs text-slate-500">
                  SKU {product.sku} · Tồn {product.availableStock}
                </div>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <StatusPill tone={product.availableStock <= product.lowStockThreshold ? "warning" : "success"}>
                    {product.availableStock <= product.lowStockThreshold ? "Tồn thấp" : "Ổn"}
                  </StatusPill>
                  <span className="text-sm font-bold tabular-nums text-slate-950">
                    {formatMoney(product.currentPrice)}
                  </span>
                </div>
              </article>
            ))}
          </div>
          <Link href="/products" className="mt-4 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg bg-brand-600 px-3 text-sm font-bold text-white focus-ring">
            Mở sản phẩm
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </section>
      </div>

      <div className="hidden md:block">
      <section className="mb-5 grid gap-4 xl:grid-cols-[1.35fr_0.65fr]">
        <div className="overflow-hidden rounded-xl bg-[#08111f] p-5 text-white shadow-soft">
          <div className="max-w-3xl">
            <div className="inline-flex rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-sky-200 ring-1 ring-white/10">
              Bàn làm việc hôm nay
            </div>
            <h2 className="mt-4 text-2xl font-bold tracking-normal sm:text-3xl">
              Tập trung vào khách, bài đăng và Ads đang cần xử lý.
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
              CRM đang gom dữ liệu thật từ Fanpage, Web Quản Lý TMĐT, AI và quảng cáo để người vận hành nhìn một lần là biết bước tiếp theo.
            </p>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <QuickAction href="/inbox" icon={<Inbox />} label="Xử lý Inbox" helper="Tin nhắn và bình luận" />
            <QuickAction href="/content-planner" icon={<CalendarDays />} label="Lên lịch bài" helper="Draft, lịch, publish job" />
            <QuickAction href="/ads" icon={<Megaphone />} label="Quản lý Ads" helper="Account, campaign, insights" />
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-[0.08em] text-slate-500">Tín hiệu cần chú ý</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Ưu tiên xử lý các SKU tồn thấp trước khi chạy nội dung hoặc quảng cáo.
              </p>
            </div>
            <ShieldCheck className="h-5 w-5 text-emerald-600" aria-hidden="true" />
          </div>
          <div className="mt-4 rounded-lg bg-slate-50 p-4">
            <div className="text-3xl font-extrabold tabular-nums text-slate-950">{lowStockProducts.length}</div>
            <div className="mt-1 text-sm text-slate-500">SKU đang dưới ngưỡng cảnh báo</div>
          </div>
          <Link href="/products" className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 focus-ring">
            Kiểm sản phẩm
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </section>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <MetricCard key={metric.label} {...metric} />
        ))}
      </div>
      <div className="mt-5 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 bg-slate-50/80 px-4 py-3">
            <h2 className="text-sm font-bold text-slate-950">
              Sản phẩm cần chú ý
            </h2>
          </div>
          <div className="divide-y divide-slate-100">
            {products.length === 0 ? (
              <div className="p-5 text-sm text-slate-600">Chưa lấy được sản phẩm thật từ Web Quản Lý TMĐT.</div>
            ) : null}
            {products.map((product) => (
              <article
                key={product.id}
                className="grid gap-3 p-4 transition hover:bg-slate-50 sm:grid-cols-[1fr_auto] sm:items-center"
              >
                <div>
                  <div className="font-bold text-slate-950">{product.name}</div>
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
                  <span className="text-sm font-bold tabular-nums text-slate-950">
                    {formatMoney(product.currentPrice)}
                  </span>
                </div>
              </article>
            ))}
          </div>
        </section>
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <PackageSearch className="h-5 w-5 text-brand-600" aria-hidden="true" />
            <h2 className="text-sm font-bold text-slate-950">Luồng dữ liệu đang dùng</h2>
          </div>
          <div className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
            <p>Sản phẩm và tồn kho gốc lấy từ Web Quản Lý TMĐT.</p>
            <p>CRM chỉ lưu cache để chọn sản phẩm, tạo nội dung, chăm sóc khách và kiểm tra trước khi thao tác.</p>
          </div>
        </section>
      </div>
      </div>
    </div>
  );
}

function QuickAction({ href, icon, label, helper }: { href: string; icon: React.ReactNode; label: string; helper: string }) {
  return (
    <Link
      href={href}
      className="group rounded-lg border border-white/10 bg-white/[0.06] p-4 transition duration-200 hover:-translate-y-0.5 hover:bg-white/[0.1] focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 focus:ring-offset-[#08111f]"
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-sky-200 [&>svg]:h-5 [&>svg]:w-5" aria-hidden="true">{icon}</span>
        <ArrowRight className="h-4 w-4 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-white" aria-hidden="true" />
      </div>
      <div className="mt-3 text-sm font-bold text-white">{label}</div>
      <div className="mt-1 text-xs text-slate-400">{helper}</div>
    </Link>
  );
}
