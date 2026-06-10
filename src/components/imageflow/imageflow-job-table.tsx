import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { StatusPill } from "@/components/ui/status-pill";
import type { ProductWithInventory } from "@/lib/ecommerce/types";
import type { ImageflowAsset, ImageflowJob, ImageflowJobStatus } from "@/lib/imageflow/types";

const jobStatus: Record<ImageflowJobStatus, { label: string; tone: "success" | "warning" | "danger" | "info" | "neutral" }> = {
  queued: { label: "Chờ tạo ảnh", tone: "warning" },
  running: { label: "Đang render", tone: "info" },
  needs_user: { label: "Cần duyệt hoặc xử lý", tone: "warning" },
  completed: { label: "Đã về CRM", tone: "success" },
  failed: { label: "Lỗi render", tone: "danger" },
  cancelled: { label: "Đã hủy", tone: "neutral" }
};

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

function ReviewStrip({
  assets,
  onReviewAsset,
  reviewingAssetId
}: {
  assets: ImageflowAsset[];
  onReviewAsset: (assetId: string, status: "approved" | "rejected") => void;
  reviewingAssetId: string | null;
}) {
  if (!assets.length) return null;
  return (
    <div className="grid gap-3 lg:grid-cols-3 xl:grid-cols-5">
      {assets.map((asset) => {
        if (!asset.publicUrl) return null;
        const pending = reviewingAssetId === asset.id;
        return (
          <article key={asset.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="aspect-[4/5] bg-slate-50">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={asset.publicUrl} alt={`Ảnh ${asset.assetIndex + 1}`} className="h-full w-full object-cover" loading="lazy" />
            </div>
            <div className="space-y-2 p-2">
              <StatusPill tone={asset.status === "approved" ? "success" : asset.status === "rejected" ? "danger" : "warning"}>
                {asset.status === "approved" ? "Đã duyệt" : asset.status === "rejected" ? "Đã loại" : "Cần duyệt"}
              </StatusPill>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={pending || asset.status === "approved"}
                  onClick={() => onReviewAsset(asset.id, "approved")}
                  className="inline-flex min-h-9 items-center justify-center gap-1 rounded-lg bg-emerald-600 px-2 text-xs font-bold text-white disabled:opacity-50"
                >
                  {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                  Dùng ảnh
                </button>
                <button
                  type="button"
                  disabled={pending || asset.status === "rejected"}
                  onClick={() => onReviewAsset(asset.id, "rejected")}
                  className="inline-flex min-h-9 items-center justify-center gap-1 rounded-lg border border-rose-200 px-2 text-xs font-bold text-rose-700 disabled:opacity-50"
                >
                  <XCircle className="h-3.5 w-3.5" />
                  Loại
                </button>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}

export function ImageflowJobTable({
  jobs,
  onReviewAsset,
  reviewingAssetId
}: {
  jobs: ImageflowJob[];
  onReviewAsset: (assetId: string, status: "approved" | "rejected") => void;
  reviewingAssetId: string | null;
}) {
  return (
    <div className="max-w-full overflow-x-auto">
      <div className="min-w-[760px] divide-y divide-slate-100">
        {jobs.map((job) => (
          <section key={job.id} className="bg-white">
            <div className="grid grid-cols-[1.5fr_1fr_0.5fr_0.9fr_0.9fr_1.4fr] items-start text-sm">
              <div className="px-4 py-3">
                <div className="font-bold text-slate-950">{productName(job.product, job.productSku)}</div>
                <div className="mt-1 text-xs text-slate-500">SKU {job.productSku}</div>
              </div>
              <div className="px-4 py-3">
                <StatusPill tone={jobStatus[job.status].tone}>{jobStatus[job.status].label}</StatusPill>
              </div>
              <div className="px-4 py-3 text-right tabular-nums">{job.assets?.length ?? 0}/{job.requestedCount}</div>
              <div className="px-4 py-3">{job.targetAspectRatio} · {job.outputWidth}x{job.outputHeight}</div>
              <div className="px-4 py-3">{shortDate(job.updatedAt)}</div>
              <div className="break-words px-4 py-3 text-slate-600 [overflow-wrap:anywhere]">{job.error || "Sẵn sàng theo dõi."}</div>
            </div>
            {job.assets?.length ? (
              <div className="border-t border-slate-100 bg-slate-50/70 p-4">
                <ReviewStrip assets={job.assets} onReviewAsset={onReviewAsset} reviewingAssetId={reviewingAssetId} />
              </div>
            ) : null}
          </section>
        ))}
      </div>
    </div>
  );
}
