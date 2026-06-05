"use client";

import { Cable, CheckCircle2, Clock3, ImagePlus, Loader2, Play, RefreshCw, ShieldAlert, Sparkles, UploadCloud } from "lucide-react";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/pages/page-header";
import { StatusPill } from "@/components/ui/status-pill";
import type { ProductWithInventory } from "@/lib/ecommerce/types";
import type { ImageflowJob, ImageflowJobStatus } from "@/lib/imageflow/types";
import { formatMoney } from "@/lib/money";

type ApiEnvelope<T> = { success: true; data: T } | { success: false; error?: string };

type Props = {
  initialJobs: ImageflowJob[];
  products: ProductWithInventory[];
};

const statusCopy: Record<ImageflowJobStatus, { label: string; tone: "success" | "warning" | "danger" | "info" | "neutral" }> = {
  queued: { label: "Chờ tạo ảnh", tone: "warning" },
  running: { label: "Đang render", tone: "info" },
  needs_user: { label: "Cần xử lý local", tone: "warning" },
  completed: { label: "Đã về CRM", tone: "success" },
  failed: { label: "Lỗi render", tone: "danger" },
  cancelled: { label: "Đã hủy", tone: "neutral" }
};

function statusTone(status: ImageflowJobStatus) {
  return statusCopy[status]?.tone ?? "neutral";
}

function statusLabel(status: ImageflowJobStatus) {
  return statusCopy[status]?.label ?? status;
}

function jobCount(jobs: ImageflowJob[], status: ImageflowJobStatus) {
  return jobs.filter((job) => job.status === status).length;
}

function shortDate(value: string | null | undefined) {
  if (!value) return "Chưa có";
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function productName(product?: ProductWithInventory | null, sku?: string) {
  return product?.name || sku || "Chưa chọn sản phẩm";
}

function assetCount(job: ImageflowJob) {
  return job.assets?.length ?? 0;
}

export function ImageflowBridgeContent({ initialJobs, products }: Props) {
  const [jobs, setJobs] = useState(initialJobs);
  const [selectedSku, setSelectedSku] = useState(products[0]?.sku ?? "");
  const [requestedCount, setRequestedCount] = useState(5);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("Chọn sản phẩm thật đã đồng bộ để tạo job ảnh 4:5 cho album Facebook.");

  const selectedProduct = useMemo(
    () => products.find((product) => product.sku === selectedSku) ?? null,
    [products, selectedSku]
  );

  async function reloadJobs() {
    const response = await fetch("/api/imageflow/jobs?limit=40", { cache: "no-store" });
    const payload = (await response.json().catch(() => null)) as ApiEnvelope<{ jobs: ImageflowJob[] }> | null;
    if (response.ok && payload?.success) setJobs(payload.data.jobs);
  }

  async function createJob() {
    if (!selectedProduct) {
      setMessage("Cần đồng bộ và chọn sản phẩm thật trước khi tạo job ImageFlow.");
      return;
    }
    setBusy(true);
    const promptJson = {
      channel: "facebook_page_album",
      creativeGoal: "Tạo bộ ảnh bán hàng và hướng dẫn thao tác thật",
      imageStyle: "Ảnh sản phẩm rõ ràng, sáng sạch, không chữ nhỏ khó đọc",
      output: { aspectRatio: "4:5", width: 1080, height: 1350, count: requestedCount }
    };
    const response = await fetch("/api/imageflow/jobs", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        productSku: selectedProduct.sku,
        title: `Album Facebook - ${selectedProduct.name}`,
        targetFormat: "facebook_album",
        targetAspectRatio: "4:5",
        outputWidth: 1080,
        outputHeight: 1350,
        requestedCount,
        promptJson
      })
    });
    const payload = (await response.json().catch(() => null)) as ApiEnvelope<ImageflowJob> | null;
    if (response.ok && payload?.success) {
      setJobs((current) => [payload.data, ...current.filter((job) => job.id !== payload.data.id)]);
      setMessage("Đã tạo job. Cầu nối local sẽ kéo job này về ImageFlow để render ảnh thật.");
    } else {
      setMessage(payload && !payload.success ? payload.error ?? "Tạo job ImageFlow lỗi." : "Tạo job ImageFlow lỗi.");
    }
    setBusy(false);
  }

  const stats = {
    queued: jobCount(jobs, "queued"),
    running: jobCount(jobs, "running"),
    needsUser: jobCount(jobs, "needs_user"),
    completed: jobCount(jobs, "completed")
  };

  const mobileView = (
    <ImageflowMobileView
      jobs={jobs}
      products={products}
      selectedSku={selectedSku}
      selectedProduct={selectedProduct}
      requestedCount={requestedCount}
      busy={busy}
      message={message}
      onSkuChange={setSelectedSku}
      onRequestedCountChange={setRequestedCount}
      onCreateJob={() => void createJob()}
      onReload={() => void reloadJobs()}
    />
  );

  const desktopView = (
    <ImageflowDesktopView
      jobs={jobs}
      products={products}
      selectedSku={selectedSku}
      selectedProduct={selectedProduct}
      requestedCount={requestedCount}
      busy={busy}
      message={message}
      stats={stats}
      onSkuChange={setSelectedSku}
      onRequestedCountChange={setRequestedCount}
      onCreateJob={() => void createJob()}
      onReload={() => void reloadJobs()}
    />
  );

  return (
    <div>
      <PageHeader
        title="Cầu nối ảnh AI"
        subtitle="Kết nối CRM production với ImageFlow local: CRM tạo job từ sản phẩm thật, local render ảnh 4:5, rồi upload ảnh về R2 để Content Planner đăng album Facebook."
        action={
          <button
            type="button"
            onClick={() => void reloadJobs()}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 focus-ring"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Làm mới
          </button>
        }
      />
      <div className="md:hidden">{mobileView}</div>
      <div className="hidden md:block">{desktopView}</div>
    </div>
  );
}

function ImageflowMobileView({
  jobs,
  products,
  selectedSku,
  selectedProduct,
  requestedCount,
  busy,
  message,
  onSkuChange,
  onRequestedCountChange,
  onCreateJob,
  onReload
}: {
  jobs: ImageflowJob[];
  products: ProductWithInventory[];
  selectedSku: string;
  selectedProduct: ProductWithInventory | null;
  requestedCount: number;
  busy: boolean;
  message: string;
  onSkuChange: (sku: string) => void;
  onRequestedCountChange: (count: number) => void;
  onCreateJob: () => void;
  onReload: () => void;
}) {
  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-2 text-sm font-bold text-slate-950">
          <ImagePlus className="h-5 w-5 text-brand-600" aria-hidden="true" />
          Tạo job album 4:5
        </div>
        <div className="mt-4 space-y-3">
          <ProductSelect products={products} selectedSku={selectedSku} onChange={onSkuChange} />
          <CountSelect value={requestedCount} onChange={onRequestedCountChange} />
          {selectedProduct ? <ProductSummary product={selectedProduct} /> : <EmptyProductState />}
          <button
            type="button"
            onClick={onCreateJob}
            disabled={busy || !selectedProduct}
            className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 text-sm font-bold text-white focus-ring disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Play className="h-4 w-4" aria-hidden="true" />}
            Tạo job render ảnh
          </button>
        </div>
        <p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm leading-6 text-slate-600">{message}</p>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-bold text-slate-950">Tiến trình gần đây</h2>
          <button type="button" onClick={onReload} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 focus-ring">
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Cập nhật
          </button>
        </div>
        {jobs.length ? jobs.map((job) => <MobileJobCard key={job.id} job={job} />) : <NoJobsState />}
      </section>
    </div>
  );
}

function ImageflowDesktopView({
  jobs,
  products,
  selectedSku,
  selectedProduct,
  requestedCount,
  busy,
  message,
  stats,
  onSkuChange,
  onRequestedCountChange,
  onCreateJob,
  onReload
}: {
  jobs: ImageflowJob[];
  products: ProductWithInventory[];
  selectedSku: string;
  selectedProduct: ProductWithInventory | null;
  requestedCount: number;
  busy: boolean;
  message: string;
  stats: { queued: number; running: number; needsUser: number; completed: number };
  onSkuChange: (sku: string) => void;
  onRequestedCountChange: (count: number) => void;
  onCreateJob: () => void;
  onReload: () => void;
}) {
  return (
    <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
      <main className="min-w-0 space-y-5">
        <section className="grid gap-3 lg:grid-cols-4">
          <MetricBox icon={Clock3} label="Chờ tạo" value={String(stats.queued)} tone="warning" />
          <MetricBox icon={Loader2} label="Đang render" value={String(stats.running)} tone="info" />
          <MetricBox icon={ShieldAlert} label="Cần xử lý" value={String(stats.needsUser)} tone="warning" />
          <MetricBox icon={CheckCircle2} label="Đã về CRM" value={String(stats.completed)} tone="success" />
        </section>

        <section className="min-w-0 rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
            <div>
              <h2 className="text-sm font-bold text-slate-950">Job ảnh cho Content Planner</h2>
              <p className="mt-1 text-sm text-slate-500">Theo dõi job local, ảnh upload về R2 và số ảnh sẵn sàng cho album.</p>
            </div>
            <button type="button" onClick={onReload} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-bold text-slate-700 focus-ring">
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              Làm mới
            </button>
          </div>
          {jobs.length ? <JobsTable jobs={jobs} /> : <NoJobsState />}
        </section>
      </main>

      <aside className="min-w-0 space-y-4">
        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-950">
            <Sparkles className="h-5 w-5 text-brand-600" aria-hidden="true" />
            Tạo job mới
          </div>
          <div className="mt-4 space-y-3">
            <ProductSelect products={products} selectedSku={selectedSku} onChange={onSkuChange} />
            <CountSelect value={requestedCount} onChange={onRequestedCountChange} />
            {selectedProduct ? <ProductSummary product={selectedProduct} /> : <EmptyProductState />}
            <button
              type="button"
              onClick={onCreateJob}
              disabled={busy || !selectedProduct}
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 text-sm font-bold text-white focus-ring disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Play className="h-4 w-4" aria-hidden="true" />}
              Tạo job 4:5
            </button>
          </div>
          <p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm leading-6 text-slate-600">{message}</p>
        </section>

        <section className="rounded-xl border border-slate-200 bg-[#08111f] p-4 text-white shadow-sm">
          <div className="flex items-center gap-2 font-bold">
            <Cable className="h-5 w-5 text-sky-200" aria-hidden="true" />
            Quy trình cầu nối
          </div>
          <ol className="mt-4 space-y-3 text-sm leading-6 text-slate-200">
            <li>1. CRM tạo job từ sản phẩm thật đã sync.</li>
            <li>2. Script local kéo job về thư mục ImageFlow.</li>
            <li>3. ImageFlow render ảnh 4:5 theo prompt sản phẩm.</li>
            <li>4. Script upload ảnh về R2 và gắn vào media bài đăng.</li>
          </ol>
          <div className="mt-4 rounded-lg bg-white/10 p-3 text-xs leading-5 text-slate-200">
            Nếu local chưa cấu hình lệnh render, job sẽ dừng ở trạng thái cần xử lý local để không tạo ảnh giả.
          </div>
        </section>
      </aside>
    </div>
  );
}

function ProductSelect({ products, selectedSku, onChange }: { products: ProductWithInventory[]; selectedSku: string; onChange: (sku: string) => void }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-700">Sản phẩm thật</span>
      <select
        value={selectedSku}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 min-h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 focus-ring"
      >
        {products.length ? null : <option value="">Chưa có sản phẩm đã sync</option>}
        {products.map((product) => (
          <option key={product.id || product.sku} value={product.sku}>
            {product.name} - {product.sku}
          </option>
        ))}
      </select>
    </label>
  );
}

function CountSelect({ value, onChange }: { value: number; onChange: (count: number) => void }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-700">Số ảnh album</span>
      <select
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-1 min-h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 focus-ring"
      >
        {[3, 4, 5, 6, 8].map((count) => (
          <option key={count} value={count}>
            {count} ảnh tỷ lệ 4:5
          </option>
        ))}
      </select>
    </label>
  );
}

function ProductSummary({ product }: { product: ProductWithInventory }) {
  return (
    <div className="grid grid-cols-[64px_1fr] gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
      <div className="h-16 w-16 overflow-hidden rounded-lg bg-white">
        {product.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={product.imageUrl} alt="" className="h-full w-full object-cover" />
        ) : null}
      </div>
      <div className="min-w-0">
        <div className="truncate text-sm font-bold text-slate-950">{product.name}</div>
        <div className="mt-1 text-xs text-slate-500">SKU {product.sku}</div>
        <div className="mt-1 text-xs text-slate-500">
          {formatMoney(product.currentPrice, product.currency)} · còn {product.availableStock}
        </div>
      </div>
    </div>
  );
}

function EmptyProductState() {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm leading-6 text-slate-600">
      Chưa có sản phẩm thật trong cache. Hãy vào trang Sản phẩm và bấm Đồng bộ trước khi tạo ảnh.
    </div>
  );
}

function MobileJobCard({ job }: { job: ImageflowJob }) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="break-words text-sm font-bold text-slate-950">{job.title}</h3>
          <p className="mt-1 text-xs text-slate-500">SKU {job.productSku}</p>
        </div>
        <StatusPill tone={statusTone(job.status)}>{statusLabel(job.status)}</StatusPill>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
        <div className="rounded-lg bg-slate-50 p-2">
          <div className="font-bold text-slate-950">{job.targetAspectRatio}</div>
          <div className="mt-1 text-slate-500">Tỷ lệ</div>
        </div>
        <div className="rounded-lg bg-slate-50 p-2">
          <div className="font-bold text-slate-950">{assetCount(job)}/{job.requestedCount}</div>
          <div className="mt-1 text-slate-500">Ảnh</div>
        </div>
        <div className="rounded-lg bg-slate-50 p-2">
          <div className="font-bold text-slate-950">{shortDate(job.updatedAt)}</div>
          <div className="mt-1 text-slate-500">Cập nhật</div>
        </div>
      </div>
      {job.error ? <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm leading-6 text-amber-800 break-words [overflow-wrap:anywhere]">{job.error}</p> : null}
    </article>
  );
}

function JobsTable({ jobs }: { jobs: ImageflowJob[] }) {
  return (
    <div className="max-w-full overflow-x-auto">
      <table className="min-w-[720px] divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50 text-left text-xs font-bold uppercase tracking-[0.06em] text-slate-500">
          <tr>
            <th className="px-4 py-3">Sản phẩm</th>
            <th className="px-4 py-3">Trạng thái</th>
            <th className="px-4 py-3 text-right">Ảnh</th>
            <th className="px-4 py-3">Tỷ lệ</th>
            <th className="px-4 py-3">Cập nhật</th>
            <th className="px-4 py-3">Ghi chú</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {jobs.map((job) => (
            <tr key={job.id} className="align-top">
              <td className="px-4 py-3">
                <div className="font-bold text-slate-950">{productName(job.product, job.productSku)}</div>
                <div className="mt-1 text-xs text-slate-500">SKU {job.productSku}</div>
              </td>
              <td className="px-4 py-3">
                <StatusPill tone={statusTone(job.status)}>{statusLabel(job.status)}</StatusPill>
              </td>
              <td className="px-4 py-3 text-right tabular-nums text-slate-700">{assetCount(job)}/{job.requestedCount}</td>
              <td className="px-4 py-3 text-slate-700">{job.targetAspectRatio} · {job.outputWidth}x{job.outputHeight}</td>
              <td className="px-4 py-3 text-slate-700">{shortDate(job.updatedAt)}</td>
              <td className="max-w-[280px] px-4 py-3 text-slate-600 break-words [overflow-wrap:anywhere]">{job.error || "Sẵn sàng theo dõi."}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MetricBox({
  icon: Icon,
  label,
  value,
  tone
}: {
  icon: typeof UploadCloud;
  label: string;
  value: string;
  tone: "success" | "warning" | "danger" | "info" | "neutral";
}) {
  const colors = {
    success: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    warning: "bg-amber-50 text-amber-700 ring-amber-200",
    danger: "bg-rose-50 text-rose-700 ring-rose-200",
    info: "bg-sky-50 text-sky-700 ring-sky-200",
    neutral: "bg-slate-50 text-slate-700 ring-slate-200"
  };
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className={`inline-flex h-10 w-10 items-center justify-center rounded-lg ring-1 ${colors[tone]}`}>
        <Icon className="h-5 w-5" aria-hidden="true" />
      </div>
      <div className="mt-3 text-2xl font-extrabold tabular-nums text-slate-950">{value}</div>
      <div className="mt-1 text-sm font-medium text-slate-500">{label}</div>
    </section>
  );
}

function NoJobsState() {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm leading-6 text-slate-600">
      Chưa có job ảnh. Tạo job đầu tiên từ sản phẩm thật để cầu nối local bắt đầu render.
    </div>
  );
}
