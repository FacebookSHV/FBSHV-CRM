"use client";

import Link from "next/link";
import { BarChart3, ChevronRight, Megaphone, PlugZap, RefreshCcw, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { PageHeader } from "@/components/pages/page-header";
import { StatusPill } from "@/components/ui/status-pill";

type AdsReadiness = {
  status: "blocked" | "ready" | "empty";
  missingPermissions: string[];
  writeActionsEnabled: boolean;
  accounts: Array<{ id: string; externalAccountId: string; name: string; status: string }>;
};

type ApiEnvelope<T> = { success: true; data: T } | { success: false; error?: string; code?: string };

export function AdsContent({ initialReadiness }: { initialReadiness: AdsReadiness }) {
  const [readiness, setReadiness] = useState(initialReadiness);
  const [status, setStatus] = useState(
    initialReadiness.writeActionsEnabled
      ? "Ads write đang bật: thao tác ghi thật cần xác nhận riêng và tạo object ở trạng thái tạm dừng."
      : "Ads chỉ đọc account thật từ Meta, không hiển thị ad account giả."
  );
  const [refreshing, setRefreshing] = useState(false);

  async function refreshAccounts() {
    setRefreshing(true);
    try {
      const response = await fetch("/api/ads/accounts/refresh", { method: "POST" });
      const payload = (await response.json().catch(() => null)) as ApiEnvelope<{ synced: number; accounts: AdsReadiness }> | null;
      if (response.ok && payload?.success) {
        setReadiness(payload.data.accounts);
        setStatus(`Đã cập nhật ${payload.data.synced} tài khoản quảng cáo thật từ Meta.`);
      } else {
        setStatus(payload && !payload.success ? payload.error ?? "Kiểm tra tài khoản quảng cáo lỗi." : "Kiểm tra tài khoản quảng cáo lỗi.");
      }
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Quản lý quảng cáo Facebook"
        subtitle={readiness.writeActionsEnabled
          ? "Theo dõi tài khoản quảng cáo thật, xem chiến dịch và tạo quảng cáo mới ở trạng thái tạm dừng để kiểm tra trước khi chạy."
          : "Theo dõi tài khoản quảng cáo thật và chuẩn bị bản nháp quảng cáo an toàn."}
        action={
          <div className="flex gap-2">
            <a
              href="/api/facebook/connect?intent=ads"
              className="inline-flex min-h-10 items-center gap-2 rounded-md bg-brand-600 px-3 text-sm font-semibold text-white focus-ring"
            >
              <PlugZap className="h-4 w-4" aria-hidden="true" />
              Kết nối tài khoản Ads
            </a>
            <button type="button" disabled={refreshing} onClick={() => void refreshAccounts()} className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-700 focus-ring disabled:cursor-not-allowed disabled:opacity-50" aria-label="Kiểm tra lại Ads" title="Kiểm tra lại Ads">
              <RefreshCcw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} aria-hidden="true" />
            </button>
          </div>
        }
      />

      <section className="mb-4 grid gap-3 md:grid-cols-3">
        <article className="rounded-md border border-slate-200 bg-white p-4 shadow-soft">
          <BarChart3 className="h-5 w-5 text-brand-600" aria-hidden="true" />
          <div className="mt-3 text-2xl font-semibold tabular-nums text-ink">{readiness.accounts.length}</div>
          <div className="text-sm text-slate-600">tài khoản quảng cáo thật</div>
        </article>
        <article className="rounded-md border border-slate-200 bg-white p-4 shadow-soft">
          <ShieldCheck className="h-5 w-5 text-brand-600" aria-hidden="true" />
          <div className="mt-3 text-lg font-semibold text-ink">{readiness.status === "ready" ? "Sẵn sàng đọc dữ liệu" : "Cần kết nối lại"}</div>
          <div className="text-sm text-slate-600">{readiness.status === "ready" ? "Campaign, nhóm quảng cáo, mẫu quảng cáo và báo cáo lấy từ Meta." : "Kết nối lại Facebook để cấp quyền Ads."}</div>
        </article>
        <article className="rounded-md border border-slate-200 bg-white p-4 shadow-soft">
          <Megaphone className="h-5 w-5 text-brand-600" aria-hidden="true" />
          <div className="mt-3 text-lg font-semibold text-ink">{readiness.writeActionsEnabled ? "Tạo thật tạm dừng" : "Chỉ lưu nháp"}</div>
          <div className="text-sm text-slate-600">{readiness.writeActionsEnabled ? "Mọi quảng cáo mới cần xác nhận và được tạo ở trạng thái tạm dừng." : "Chưa bật ghi thật, người dùng vẫn tạo được draft nội bộ."}</div>
        </article>
      </section>

      <div className="mb-4 flex flex-wrap items-center gap-2 rounded-md border border-slate-200 bg-white p-3 shadow-soft">
        <StatusPill tone={readiness.status === "ready" ? "success" : "warning"}>{readiness.status === "ready" ? "Đã kết nối" : "Cần kiểm tra"}</StatusPill>
        <span className="text-sm text-slate-600">{status}</span>
      </div>

      <section className="rounded-md border border-slate-200 bg-white p-4 shadow-soft">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-ink">Tài khoản quảng cáo</h2>
            <p className="mt-1 text-sm text-slate-600">
              {readiness.status === "blocked"
                ? "Cần kết nối lại Facebook Ads để cấp đủ quyền đọc tài khoản quảng cáo."
                : readiness.status === "empty"
                  ? "Đã có quyền đọc nhưng chưa tìm thấy tài khoản quảng cáo thật."
                  : "Bấm vào từng tài khoản để xem chiến dịch, nhóm quảng cáo, mẫu quảng cáo, báo cáo và tạo quảng cáo."}
            </p>
          </div>
          <StatusPill tone={readiness.writeActionsEnabled ? "warning" : "success"}>
            {readiness.writeActionsEnabled ? "Write đang bật" : "Ads write đang chặn"}
          </StatusPill>
        </div>
      </section>

      {readiness.accounts.length > 0 ? (
        <section className="mt-4 grid gap-3 md:grid-cols-2">
          {readiness.accounts.map((account) => (
            <Link
              key={account.id}
              href={`/ads/accounts/${encodeURIComponent(account.externalAccountId)}`}
              className="group min-w-0 overflow-hidden rounded-md border border-slate-200 bg-white p-4 shadow-soft focus-ring hover:border-brand-200 hover:bg-brand-50/40"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h3 className="break-words text-sm font-semibold text-ink">{account.name}</h3>
                  <p className="mt-1 break-all text-xs text-slate-500">{account.externalAccountId}</p>
                </div>
                <ChevronRight className="h-5 w-5 flex-none text-slate-400 group-hover:text-brand-700" aria-hidden="true" />
              </div>
              <div className="mt-3"><StatusPill tone="info">{account.status}</StatusPill></div>
              <div className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-brand-700">
                Mở quản lý <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </div>
            </Link>
          ))}
        </section>
      ) : null}
    </div>
  );
}
