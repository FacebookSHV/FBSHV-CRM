"use client";

import Link from "next/link";
import { ChevronRight, PlugZap, RefreshCcw, ShieldAlert } from "lucide-react";
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

const requiredRead = ["business_management", "ads_read"];
const requiredWrite = ["ads_management"];

export function AdsContent({ initialReadiness }: { initialReadiness: AdsReadiness }) {
  const [readiness, setReadiness] = useState(initialReadiness);
  const [status, setStatus] = useState("Ads chỉ đọc account thật từ Meta, không hiển thị ad account giả.");
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
        title="Facebook Ads"
        subtitle="Kết nối và quản lý ad account thật ở chế độ read-only; mọi Ads write bị chặn nếu chưa bật cờ an toàn."
        action={
          <div className="flex gap-2">
            <a
              href="/api/facebook/connect?intent=ads"
              className="inline-flex min-h-10 items-center gap-2 rounded-md bg-brand-600 px-3 text-sm font-semibold text-white focus-ring"
            >
              <PlugZap className="h-4 w-4" aria-hidden="true" />
              Connect Ads Account
            </a>
            <button type="button" disabled={refreshing} onClick={() => void refreshAccounts()} className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-700 focus-ring disabled:cursor-not-allowed disabled:opacity-50" aria-label="Kiểm tra lại Ads" title="Kiểm tra lại Ads">
              <RefreshCcw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} aria-hidden="true" />
            </button>
          </div>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2 rounded-md border border-slate-200 bg-white p-3 shadow-soft">
        <StatusPill tone={readiness.status === "ready" ? "success" : "warning"}>{readiness.status}</StatusPill>
        <span className="text-sm text-slate-600">{status}</span>
      </div>

      <section className="rounded-md border border-slate-200 bg-white p-4 shadow-soft">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-ink">Trạng thái Ads account</h2>
            <p className="mt-1 text-sm text-slate-600">
              {readiness.status === "blocked"
                ? `Thiếu quyền ${readiness.missingPermissions.join(", ")} nên chưa gọi Ads Graph API.`
                : readiness.status === "empty"
                  ? "Đã có quyền đọc nhưng chưa cache được ad account thật trong CRM."
                  : "Đã cache ad account thật. Bấm vào từng account để xem campaign, ad set, ads, insights và tạo draft."}
            </p>
          </div>
          <StatusPill tone={readiness.writeActionsEnabled ? "warning" : "success"}>
            {readiness.writeActionsEnabled ? "Write cần ads_management" : "Ads write đang chặn"}
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
            </Link>
          ))}
        </section>
      ) : null}

      <section className="mt-4 grid gap-3 md:grid-cols-3">
        {[...requiredRead, ...requiredWrite].map((scope) => (
          <article key={scope} className="rounded-md border border-slate-200 bg-white p-4 shadow-soft">
            <ShieldAlert className="h-5 w-5 text-brand-600" aria-hidden="true" />
            <h3 className="mt-3 text-sm font-semibold text-ink">{scope}</h3>
            <p className="mt-2 text-sm text-slate-600">
              {scope === "ads_management"
                ? "Chỉ dùng cho thao tác ghi Ads, hiện bị chặn bởi AD_WRITE_ACTIONS_ENABLED nếu chưa bật."
                : "Cần cho Connect Ads Account và đọc danh sách ad account thật."}
            </p>
          </article>
        ))}
      </section>
    </div>
  );
}
