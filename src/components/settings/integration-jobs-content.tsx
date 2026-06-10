"use client";

import { Activity, RefreshCcw, RotateCcw, XCircle } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/pages/page-header";
import { StatusPill } from "@/components/ui/status-pill";

type IntegrationJob = {
  id: string;
  jobType: string;
  sourceSystem: string;
  targetSystem: string;
  status: "queued" | "running" | "needs_user" | "completed" | "failed" | "cancelled";
  retryCount: number;
  maxRetryCount: number;
  errorMessage: string | null;
  updatedAt: string;
};

type ApiEnvelope<T> = { success: true; data: T } | { success: false; error?: string };
type ToastState = { message: string; tone: "success" | "danger" } | null;

const statusCopy = {
  queued: { label: "Đang chờ", tone: "warning" as const },
  running: { label: "Đang xử lý", tone: "info" as const },
  needs_user: { label: "Cần kiểm tra", tone: "warning" as const },
  completed: { label: "Hoàn tất", tone: "success" as const },
  failed: { label: "Không thành công", tone: "danger" as const },
  cancelled: { label: "Đã hủy", tone: "neutral" as const }
};

function jobLabel(type: string) {
  const labels: Record<string, string> = {
    process_facebook_webhook_event: "Nhận tin nhắn và bình luận Facebook",
    sync_product_to_crm: "Đồng bộ sản phẩm",
    sync_order_status_to_crm: "Cập nhật trạng thái đơn",
    create_facebook_order: "Tạo đơn Facebook",
    generate_facebook_content: "Tạo nội dung Facebook",
    render_imageflow_asset: "Tạo ảnh nội dung",
    publish_facebook_post: "Đăng bài Facebook",
    send_capi_event: "Gửi tín hiệu chuyển đổi",
    create_ads_draft: "Tạo bản nháp quảng cáo",
    sync_chat_core_context: "Đồng bộ hội thoại"
  };
  return labels[type] || "Tác vụ đồng bộ";
}

function sourceLabel(value: string) {
  if (value === "facebook") return "Facebook";
  if (value === "web-tmdt") return "Web Quản Lý TMĐT";
  if (value === "imageflow") return "Cầu nối ảnh AI";
  return "Hệ thống";
}

function formatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Chưa xác định";
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Asia/Ho_Chi_Minh"
  }).format(date);
}

function friendlyError(value?: string | null) {
  if (!value) return "Tác vụ chưa hoàn tất. Vui lòng thử lại.";
  if (value.includes("INTEGRATION_EVENT_NOT_FOUND")) return "Không tìm thấy dữ liệu nguồn để xử lý.";
  if (value.includes("INTEGRATION_JOB_HANDLER_MISSING")) return "Tác vụ này chưa được hỗ trợ tự động.";
  if (value.includes("INTEGRATION_JOB_NOT_RETRYABLE")) return "Tác vụ này không thể thử lại ở trạng thái hiện tại.";
  if (value.includes("INTEGRATION_JOB_NOT_CANCELLABLE")) return "Tác vụ này không thể hủy ở trạng thái hiện tại.";
  if (value.includes("REQUEST_ORIGIN_NOT_ALLOWED")) return "Phiên thao tác không hợp lệ. Vui lòng tải lại trang.";
  if (value.includes("BLOCKED_BY_MISSING_BINDING")) return "Hệ thống lưu trữ chưa sẵn sàng.";
  if (value.includes("MAX_RETRY")) return "Tác vụ đã đạt số lần thử tối đa.";
  return "Tác vụ chưa hoàn tất. Vui lòng thử lại hoặc kiểm tra cấu hình.";
}

export function IntegrationJobsContent() {
  const [jobs, setJobs] = useState<IntegrationJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [toast, setToast] = useState<ToastState>(null);
  const [error, setError] = useState("");

  const loadJobs = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/settings/integration-jobs?limit=100", { cache: "no-store" });
      const payload = (await response.json().catch(() => null)) as ApiEnvelope<{ jobs: IntegrationJob[] }> | null;
      if (response.ok && payload?.success) {
        setJobs(payload.data.jobs);
      } else {
        setError("Không tải được tiến trình đồng bộ.");
      }
    } catch {
      setError("Không kết nối được hệ thống. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadJobs();
  }, [loadJobs]);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 3000);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const summary = useMemo(
    () => ({
      waiting: jobs.filter((job) => job.status === "queued").length,
      running: jobs.filter((job) => job.status === "running").length,
      attention: jobs.filter((job) => job.status === "failed" || job.status === "needs_user").length,
      completed: jobs.filter((job) => job.status === "completed").length
    }),
    [jobs]
  );

  async function changeJob(id: string, action: "retry" | "cancel") {
    setBusyId(id);
    try {
      const response = await fetch(`/api/settings/integration-jobs/${encodeURIComponent(id)}/${action}`, { method: "POST" });
      const payload = (await response.json().catch(() => null)) as ApiEnvelope<unknown> | null;
      if (response.ok && payload?.success) {
        setToast({
          message: action === "retry" ? "Đã đưa tác vụ vào hàng chờ xử lý lại." : "Đã hủy tác vụ.",
          tone: "success"
        });
      } else {
        setToast({
          message: friendlyError(payload && !payload.success ? payload.error : null),
          tone: "danger"
        });
      }
      await loadJobs();
    } catch {
      setToast({ message: "Không kết nối được hệ thống. Vui lòng thử lại.", tone: "danger" });
    } finally {
      setBusyId("");
    }
  }

  return (
    <div>
      <PageHeader
        title="Tiến trình đồng bộ"
        subtitle="Theo dõi các tác vụ giữa Facebook, Web Quản Lý TMĐT và hệ thống tạo nội dung."
        action={
          <button
            type="button"
            onClick={() => void loadJobs()}
            disabled={loading}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-brand-600 px-4 text-sm font-semibold text-white transition-opacity hover:opacity-80 disabled:opacity-50"
          >
            <RefreshCcw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} aria-hidden="true" />
            {loading ? "Đang tải..." : "Làm mới"}
          </button>
        }
      />

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <SummaryCard label="Đang chờ" value={summary.waiting} />
        <SummaryCard label="Đang xử lý" value={summary.running} />
        <SummaryCard label="Cần kiểm tra" value={summary.attention} />
        <SummaryCard label="Đã hoàn tất" value={summary.completed} />
      </section>

      {error ? (
        <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          <div className="font-semibold">Chưa tải được tiến trình</div>
          <div className="mt-1">{error}</div>
          <button type="button" onClick={() => void loadJobs()} className="mt-3 min-h-10 rounded-md border border-rose-200 px-3 font-semibold">
            Thử lại
          </button>
        </div>
      ) : null}

      {loading ? <LoadingJobs /> : null}

      {!loading && !error && jobs.length === 0 ? (
        <section className="mt-4 flex min-h-64 flex-col items-center justify-center rounded-lg border border-slate-200 bg-white p-6 text-center shadow-soft">
          <Activity className="h-12 w-12 text-slate-300" aria-hidden="true" />
          <h2 className="mt-3 text-base font-semibold text-slate-700">Chưa có tác vụ đồng bộ nào</h2>
          <p className="mt-1 text-sm text-slate-500">Các lần nhận dữ liệu và xử lý tự động sẽ xuất hiện tại đây.</p>
        </section>
      ) : null}

      {!loading && jobs.length > 0 ? (
        <>
          <div className="mt-4 grid gap-3 md:hidden">
            {jobs.map((job) => (
              <JobCard key={job.id} job={job} busy={busyId === job.id} onAction={changeJob} />
            ))}
          </div>

          <div className="mt-4 hidden overflow-hidden rounded-lg border border-slate-200 bg-white shadow-soft md:block">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Tác vụ</th>
                    <th className="px-4 py-3">Nguồn</th>
                    <th className="px-4 py-3">Trạng thái</th>
                    <th className="px-4 py-3 text-right">Lần thử</th>
                    <th className="px-4 py-3">Cập nhật</th>
                    <th className="px-4 py-3 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {jobs.map((job) => (
                    <tr key={job.id} className="transition-colors hover:bg-slate-50/70">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-ink">{jobLabel(job.jobType)}</div>
                        {job.errorMessage ? <div className="mt-1 max-w-md text-xs text-rose-600">{friendlyError(job.errorMessage)}</div> : null}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{sourceLabel(job.sourceSystem)}</td>
                      <td className="px-4 py-3"><StatusPill tone={statusCopy[job.status].tone}>{statusCopy[job.status].label}</StatusPill></td>
                      <td className="px-4 py-3 text-right tabular-nums">{job.retryCount}/{job.maxRetryCount}</td>
                      <td className="px-4 py-3 text-slate-600">{formatTime(job.updatedAt)}</td>
                      <td className="px-4 py-3"><JobActions job={job} busy={busyId === job.id} onAction={changeJob} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : null}

      {toast ? (
        <div
          role="status"
          className={`fixed bottom-5 right-5 z-[999] max-w-sm rounded-lg border bg-white px-4 py-3 text-sm font-semibold shadow-soft ${
            toast.tone === "success" ? "border-emerald-200 text-emerald-700" : "border-rose-200 text-rose-700"
          }`}
        >
          {toast.message}
        </div>
      ) : null}
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-xs font-semibold uppercase text-slate-500">{label}</div>
      <div className="mt-2 text-2xl font-bold tabular-nums text-slate-950">{value}</div>
    </article>
  );
}

function JobActions({ job, busy, onAction }: { job: IntegrationJob; busy: boolean; onAction: (id: string, action: "retry" | "cancel") => Promise<void> }) {
  const retryable = job.status === "failed" || job.status === "needs_user";
  const cancellable = job.status === "queued" || job.status === "running" || job.status === "needs_user";
  return (
    <div className="flex justify-end gap-2">
      {retryable ? (
        <button type="button" disabled={busy} onClick={() => void onAction(job.id, "retry")} className="inline-flex min-h-9 items-center gap-1 rounded-md border border-slate-200 px-3 text-xs font-semibold text-slate-700 disabled:opacity-50">
          <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" /> {busy ? "Đang xử lý..." : "Thử lại"}
        </button>
      ) : null}
      {cancellable ? (
        <button type="button" disabled={busy} onClick={() => void onAction(job.id, "cancel")} className="inline-flex min-h-9 items-center gap-1 rounded-md border border-rose-200 px-3 text-xs font-semibold text-rose-700 disabled:opacity-50">
          <XCircle className="h-3.5 w-3.5" aria-hidden="true" /> Hủy
        </button>
      ) : null}
    </div>
  );
}

function JobCard({ job, busy, onAction }: { job: IntegrationJob; busy: boolean; onAction: (id: string, action: "retry" | "cancel") => Promise<void> }) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-soft">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-ink">{jobLabel(job.jobType)}</h2>
          <p className="mt-1 text-xs text-slate-500">{sourceLabel(job.sourceSystem)} · {formatTime(job.updatedAt)}</p>
        </div>
        <StatusPill tone={statusCopy[job.status].tone}>{statusCopy[job.status].label}</StatusPill>
      </div>
      <div className="mt-3 text-xs text-slate-600">Đã thử <span className="font-semibold tabular-nums">{job.retryCount}/{job.maxRetryCount}</span> lần</div>
      {job.errorMessage ? <div className="mt-2 rounded-md bg-rose-50 p-3 text-xs text-rose-700">{friendlyError(job.errorMessage)}</div> : null}
      <div className="mt-3"><JobActions job={job} busy={busy} onAction={onAction} /></div>
    </article>
  );
}

function LoadingJobs() {
  return (
    <div className="mt-4 grid gap-3">
      {Array.from({ length: 5 }, (_, index) => (
        <div key={index} className="h-20 animate-pulse rounded-lg border border-slate-200 bg-slate-100" />
      ))}
    </div>
  );
}
