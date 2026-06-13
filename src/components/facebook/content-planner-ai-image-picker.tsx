"use client";

import { ImagePlus, Loader2, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { StatusPill } from "@/components/ui/status-pill";
import type { ImageflowAsset, ImageflowJob } from "@/lib/imageflow/types";

type ImageflowJobsEnvelope = { success: boolean; data?: { jobs: ImageflowJob[] }; error?: string };

export type PlannerAiAsset = ImageflowAsset & {
  jobId: string;
  productSku: string;
};

type ContentPlannerAiImagePickerProps = {
  initialAssetId?: string | null;
  productName?: string | null;
  productSku: string;
  selectedAssetId?: string | null;
  onSelectAsset: (asset: PlannerAiAsset | null) => void;
};

function collectApprovedAssets(jobs: ImageflowJob[], productSku: string) {
  return jobs
    .filter((job) => job.productSku === productSku)
    .flatMap((job) =>
      (job.assets ?? [])
        .filter((asset) => asset.status === "approved" && asset.publicUrl)
        .map((asset) => ({ ...asset, jobId: job.id, productSku: job.productSku }))
    )
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

function countJobs(jobs: ImageflowJob[], status: ImageflowJob["status"]) {
  return jobs.filter((job) => job.status === status).length;
}

// NEO: Ảnh cho bài đăng đi qua Content Planner; CRM không mở màn hình cầu nối vận hành riêng.
export function ContentPlannerAiImagePicker({
  initialAssetId,
  productSku,
  selectedAssetId,
  onSelectAsset
}: ContentPlannerAiImagePickerProps) {
  const [jobs, setJobs] = useState<ImageflowJob[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("Chọn sản phẩm rồi lưu hoặc lên lịch bài để hệ thống tự xếp tạo ảnh.");

  const productJobs = useMemo(() => jobs.filter((job) => job.productSku === productSku), [jobs, productSku]);
  const assets = useMemo(() => collectApprovedAssets(jobs, productSku), [jobs, productSku]);
  const selectedAsset = useMemo(() => assets.find((asset) => asset.id === selectedAssetId) ?? null, [assets, selectedAssetId]);

  const loadAssets = useCallback(
    async (nextMessage?: string) => {
      if (!productSku) {
        setJobs([]);
        setMessage("Chưa chọn sản phẩm nên chưa tải danh sách ảnh AI.");
        return;
      }

      setLoading(true);
      const response = await fetch("/api/imageflow/jobs?limit=40", { cache: "no-store" });
      const payload = (await response.json().catch(() => null)) as ImageflowJobsEnvelope | null;
      if (response.ok && payload?.success && payload.data) {
        setJobs(payload.data.jobs);
        const approved = collectApprovedAssets(payload.data.jobs, productSku);
        const relatedJobs = payload.data.jobs.filter((job) => job.productSku === productSku);
        setMessage(
          nextMessage ||
            (approved.length
              ? `Đã có ${approved.length} ảnh đã duyệt cho SKU ${productSku}.`
              : relatedJobs.length
                ? "Ảnh đang được xử lý. Bấm làm mới sau khi local runtime render xong."
                : "Chưa có ảnh cho SKU này. Lưu hoặc lên lịch bài để tự xếp tạo ảnh.")
        );
        if (initialAssetId) {
          const matched = approved.find((asset) => asset.id === initialAssetId) ?? null;
          if (matched) onSelectAsset(matched);
        }
      } else {
        setMessage(payload?.error || "Không tải được danh sách ảnh AI.");
      }
      setLoading(false);
    },
    [initialAssetId, onSelectAsset, productSku]
  );

  useEffect(() => {
    void loadAssets();
  }, [loadAssets]);

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-slate-900">Bước 2 - Ảnh AI cho bài đăng</div>
          <div className="mt-1 text-xs leading-5 text-slate-600">
            Không có màn hình riêng. Khi lưu hoặc lên lịch bài, CRM tự xếp ảnh qua Pool Scheduler và bạn làm mới để chọn ảnh đã về.
          </div>
        </div>
        <button
          type="button"
          onClick={() => void loadAssets()}
          disabled={loading || !productSku}
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 focus-ring disabled:opacity-60"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <RefreshCw className="h-4 w-4" aria-hidden="true" />}
          Làm mới ảnh
        </button>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <StatusPill tone={selectedAsset ? "success" : "info"}>{selectedAsset ? "Đã chọn ảnh AI" : "Chưa chọn ảnh AI"}</StatusPill>
        <StatusPill tone={assets.length ? "success" : "warning"}>{assets.length} ảnh đã duyệt</StatusPill>
        {productJobs.length ? <StatusPill tone="neutral">{productJobs.length} lượt xử lý</StatusPill> : null}
        {countJobs(productJobs, "queued") ? <StatusPill tone="warning">{countJobs(productJobs, "queued")} đang chờ</StatusPill> : null}
        {countJobs(productJobs, "running") ? <StatusPill tone="info">{countJobs(productJobs, "running")} đang chạy</StatusPill> : null}
      </div>

      <p className="mt-3 rounded-lg bg-white p-3 text-sm leading-6 text-slate-600">{message}</p>

      {selectedAsset ? (
        <div className="mt-3 rounded-xl border border-emerald-200 bg-white p-3">
          <div className="mb-2 text-sm font-semibold text-emerald-700">Ảnh đang dùng cho bài này</div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={selectedAsset.publicUrl ?? ""} alt={selectedAsset.fileName} className="aspect-[4/5] w-full rounded-lg object-cover md:max-h-72 md:w-auto" />
        </div>
      ) : null}

      {assets.length ? (
        <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
          {assets.map((asset) => {
            const active = asset.id === selectedAssetId;
            return (
              <button
                type="button"
                key={asset.id}
                onClick={() => onSelectAsset(asset)}
                className={`overflow-hidden rounded-xl border text-left transition ${active ? "border-brand-500 ring-2 ring-brand-200" : "border-slate-200 bg-white hover:border-brand-300"}`}
              >
                <div className="aspect-[4/5] bg-slate-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={asset.publicUrl ?? ""} alt={asset.fileName} className="h-full w-full object-cover" loading="lazy" />
                </div>
                <div className="p-2">
                  <div className="text-xs font-semibold text-slate-900">Ảnh {asset.assetIndex + 1}</div>
                  <div className="mt-1 text-[11px] text-slate-500">{new Date(asset.createdAt).toLocaleString("vi-VN")}</div>
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="mt-3 rounded-xl border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-500">
          <div className="flex items-center gap-2 font-semibold text-slate-700">
            <ImagePlus className="h-4 w-4" aria-hidden="true" />
            Chưa có ảnh AI đã duyệt
          </div>
          <div className="mt-2 leading-6">
            Hãy lưu hoặc lên lịch bài. Khi ảnh render xong, quay lại đây bấm &quot;Làm mới ảnh&quot; để chọn hoặc để publish job tự dùng ảnh đã upload.
          </div>
        </div>
      )}
    </div>
  );
}
