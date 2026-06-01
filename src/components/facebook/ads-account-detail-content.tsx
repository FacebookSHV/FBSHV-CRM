"use client";

import Link from "next/link";
import { ArrowLeft, RefreshCcw, Save } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { ProductSearchPicker } from "@/components/products/product-search-picker";
import { StatusPill } from "@/components/ui/status-pill";
import type { ProductWithInventory } from "@/lib/ecommerce/types";

type ApiEnvelope<T> = { success: true; data: T } | { success: false; error?: string; code?: string };

type AccountDetail = {
  id: string;
  externalAccountId: string;
  name: string;
  status: string;
  currency?: string | null;
  timezoneName?: string | null;
  writeActionsEnabled: boolean;
};

type DraftForm = {
  name: string;
  budgetDaily: string;
  objective: string;
  schedule: string;
  audience: string;
  creativeText: string;
  productSku: string;
};

const tabs = ["Overview", "Campaigns", "Ad Sets", "Ads", "Insights", "Create Ad / Draft"] as const;
const datePresets = [
  { label: "Hôm nay", value: "today" },
  { label: "7 ngày", value: "last_7d" },
  { label: "30 ngày", value: "last_30d" },
  { label: "Tháng này", value: "this_month" }
];

function money(value: unknown, currency = "VND") {
  const numeric = Number(value ?? 0);
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency }).format(Number.isFinite(numeric) ? numeric : 0);
}

function cell(value: unknown) {
  if (value === null || value === undefined || value === "") return "-";
  if (Array.isArray(value)) return `${value.length} hành động`;
  if (typeof value === "object") return "Có dữ liệu";
  if (typeof value === "boolean") return value ? "Có" : "Không";
  return String(value);
}

const fieldLabels: Record<string, string> = {
  id: "Mã",
  name: "Tên",
  status: "Trạng thái",
  effective_status: "Trạng thái thực tế",
  objective: "Mục tiêu",
  created_time: "Ngày tạo",
  updated_time: "Cập nhật",
  campaign_id: "Mã chiến dịch",
  adset_id: "Mã nhóm quảng cáo",
  optimization_goal: "Mục tiêu tối ưu",
  billing_event: "Cách tính phí",
  daily_budget: "Ngân sách ngày",
  lifetime_budget: "Ngân sách tổng",
  spend: "Chi tiêu",
  impressions: "Lượt hiển thị",
  reach: "Tiếp cận",
  clicks: "Lượt nhấp",
  ctr: "CTR",
  cpc: "CPC",
  cpm: "CPM",
  actions: "Hành động",
  preview_shareable_link: "Xem trước",
  creative: "Nội dung quảng cáo",
  targeting: "Đối tượng"
};

export function AdsAccountDetailContent({ accountId }: { accountId: string }) {
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]>("Overview");
  const [account, setAccount] = useState<AccountDetail | null>(null);
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [status, setStatus] = useState("Đang tải ad account thật từ Meta.");
  const [refreshing, setRefreshing] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [datePreset, setDatePreset] = useState("last_7d");
  const [level, setLevel] = useState("account");
  const [selectedProduct, setSelectedProduct] = useState<ProductWithInventory | null>(null);
  const tabRequestId = useRef(0);
  const [draft, setDraft] = useState<DraftForm>({
    name: "Boost post draft",
    budgetDaily: "100000",
    objective: "OUTCOME_ENGAGEMENT",
    schedule: "",
    audience: "Khách quan tâm nhà thông minh và đồ điện gia dụng",
    creativeText: "",
    productSku: ""
  });

  const encodedAccountId = useMemo(() => encodeURIComponent(accountId), [accountId]);

  async function read<T>(path: string) {
    const response = await fetch(path, { cache: "no-store" });
    const payload = (await response.json().catch(() => null)) as ApiEnvelope<T> | null;
    if (response.ok && payload?.success) return payload.data;
    throw new Error(payload && !payload.success ? payload.error ?? "API Ads lỗi." : "API Ads lỗi.");
  }

  async function loadAccount() {
    try {
      const data = await read<{ account: AccountDetail }>(`/api/ads/accounts/${encodedAccountId}`);
      setAccount(data.account);
      setStatus("Đã tải ad account thật từ Meta Marketing API.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Không tải được ad account.");
    }
  }

  async function loadTab(tab = activeTab) {
    const requestId = ++tabRequestId.current;
    try {
      if (tab === "Create Ad / Draft") {
        setRows([]);
        return;
      }
      const path =
        tab === "Campaigns"
          ? `/api/ads/accounts/${encodedAccountId}/campaigns`
          : tab === "Ad Sets"
            ? `/api/ads/accounts/${encodedAccountId}/adsets`
            : tab === "Ads"
              ? `/api/ads/accounts/${encodedAccountId}/ads`
              : `/api/ads/accounts/${encodedAccountId}/insights?date_preset=${encodeURIComponent(datePreset)}&level=${encodeURIComponent(level)}`;
      const data = await read<Record<string, Record<string, unknown>[]>>(path);
      const key = tab === "Campaigns" ? "campaigns" : tab === "Ad Sets" ? "adsets" : tab === "Ads" ? "ads" : "insights";
      if (requestId !== tabRequestId.current) return;
      setRows(data[key] ?? []);
      setStatus(`Đã tải ${data[key]?.length ?? 0} dòng cho tab ${tab}.`);
    } catch (error) {
      if (requestId !== tabRequestId.current) return;
      setRows([]);
      setStatus(error instanceof Error ? error.message : "Không tải được dữ liệu Ads.");
    }
  }

  async function refreshAll() {
    setRefreshing(true);
    try {
      await loadAccount();
      await loadTab(activeTab);
    } finally {
      setRefreshing(false);
    }
  }

  async function createDraft() {
    setSavingDraft(true);
    try {
      const response = await fetch(`/api/ads/accounts/${encodedAccountId}/drafts`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...draft,
          productSku: selectedProduct?.sku || draft.productSku,
          budgetDaily: Number(draft.budgetDaily)
        })
      });
      const payload = (await response.json().catch(() => null)) as ApiEnvelope<{ draft: { id: string; status: string } }> | null;
      if (response.ok && payload?.success) {
        setStatus(`Đã tạo draft quảng cáo nội bộ ${payload.data.draft.id}. ${account?.writeActionsEnabled ? "Thao tác ghi thật cần xác nhận riêng." : "Ads write đang bị chặn bởi AD_WRITE_ACTIONS_ENABLED=false."}`);
      } else {
        setStatus(payload && !payload.success ? payload.error ?? "Tạo draft lỗi." : "Tạo draft lỗi.");
      }
    } finally {
      setSavingDraft(false);
    }
  }

  useEffect(() => {
    void loadAccount();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [encodedAccountId]);

  useEffect(() => {
    void loadTab(activeTab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, datePreset, level, encodedAccountId]);

  const overview = rows[0] ?? {};

  return (
    <div>
      <Link href="/ads" className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-brand-700">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Quay lại Ads
      </Link>

      <div className="mb-4 rounded-md border border-slate-200 bg-white p-4 shadow-soft">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-ink">{account?.name || accountId}</h1>
            <p className="mt-1 text-sm text-slate-600">{account?.externalAccountId || accountId}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <StatusPill tone="info">{account?.status || "loading"}</StatusPill>
              <StatusPill tone={account?.writeActionsEnabled ? "warning" : "success"}>
                {account?.writeActionsEnabled ? "Write đang bật" : "Ads write đang bị chặn bởi AD_WRITE_ACTIONS_ENABLED=false"}
              </StatusPill>
              {account?.currency ? <StatusPill tone="neutral">{account.currency}</StatusPill> : null}
              {account?.timezoneName ? <StatusPill tone="neutral">{account.timezoneName}</StatusPill> : null}
            </div>
          </div>
          <button type="button" disabled={refreshing} onClick={() => void refreshAll()} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-slate-200 px-3 text-sm font-semibold text-slate-700 focus-ring disabled:cursor-not-allowed disabled:opacity-50">
            <RefreshCcw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} aria-hidden="true" />
            {refreshing ? "Đang cập nhật..." : "Cập nhật"}
          </button>
        </div>
        <div className="mt-3 text-sm text-slate-600">{status}</div>
      </div>

      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        {tabs.map((tab) => (
          <button
            type="button"
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={[
              "whitespace-nowrap rounded-md border px-3 py-2 text-sm font-semibold focus-ring",
              activeTab === tab ? "border-brand-600 bg-brand-50 text-brand-700" : "border-slate-200 bg-white text-slate-600"
            ].join(" ")}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === "Overview" ? (
        <section className="grid gap-3 md:grid-cols-3">
          {[
            ["Spend", money(overview.spend, account?.currency || "VND")],
            ["Impressions", cell(overview.impressions)],
            ["Reach", cell(overview.reach)],
            ["Clicks", cell(overview.clicks)],
            ["CTR", cell(overview.ctr)],
            ["CPC", cell(overview.cpc)]
          ].map(([label, value]) => (
            <div key={label} className="rounded-md border border-slate-200 bg-white p-4 shadow-soft">
              <div className="text-xs text-slate-500">{label}</div>
              <div className="mt-1 text-lg font-semibold text-ink">{value}</div>
            </div>
          ))}
        </section>
      ) : null}

      {activeTab === "Insights" ? (
        <div className="mb-4 grid gap-2 rounded-md border border-slate-200 bg-white p-3 shadow-soft md:grid-cols-[1fr_1fr]">
          <label className="block">
            <span className="text-xs font-medium text-slate-600">Date range</span>
            <select value={datePreset} onChange={(event) => setDatePreset(event.target.value)} className="mt-1 min-h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm">
              {datePresets.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-medium text-slate-600">Breakdown level</span>
            <select value={level} onChange={(event) => setLevel(event.target.value)} className="mt-1 min-h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm">
              <option value="account">account</option>
              <option value="campaign">campaign</option>
              <option value="adset">adset</option>
              <option value="ad">ad</option>
            </select>
          </label>
        </div>
      ) : null}

      {activeTab !== "Overview" && activeTab !== "Create Ad / Draft" ? <DataTable rows={rows} /> : null}

      {activeTab === "Create Ad / Draft" ? (
        <section className="rounded-md border border-slate-200 bg-white p-4 shadow-soft">
          <div className="mb-4">
            <h2 className="text-sm font-semibold text-ink">Tạo quảng cáo nháp</h2>
            <p className="mt-1 text-sm text-slate-600">
              {account?.writeActionsEnabled
                ? "Thao tác ghi thật chỉ chạy sau bước xác nhận riêng và cần quyền quản lý quảng cáo."
                : "Ads write đang bị chặn bởi AD_WRITE_ACTIONS_ENABLED=false. Form này chỉ lưu bản nháp nội bộ."}
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Tên draft</span>
              <input value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} className="mt-1 min-h-10 w-full rounded-md border border-slate-200 px-3 text-sm" />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Ngân sách ngày</span>
              <input value={draft.budgetDaily} onChange={(event) => setDraft((current) => ({ ...current, budgetDaily: event.target.value }))} className="mt-1 min-h-10 w-full rounded-md border border-slate-200 px-3 text-sm" />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Mục tiêu</span>
              <select value={draft.objective} onChange={(event) => setDraft((current) => ({ ...current, objective: event.target.value }))} className="mt-1 min-h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm">
                <option>OUTCOME_ENGAGEMENT</option>
                <option>OUTCOME_TRAFFIC</option>
                <option>OUTCOME_SALES</option>
              </select>
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Lịch chạy</span>
              <input type="datetime-local" value={draft.schedule} onChange={(event) => setDraft((current) => ({ ...current, schedule: event.target.value }))} className="mt-1 min-h-10 w-full rounded-md border border-slate-200 px-3 text-sm" />
            </label>
            <div className="md:col-span-2">
              <ProductSearchPicker label="Chọn sản phẩm" selectedSku={selectedProduct?.sku} onSelect={setSelectedProduct} />
            </div>
            <label className="block md:col-span-2">
              <span className="text-sm font-medium text-slate-700">Nhóm khách hàng</span>
              <input value={draft.audience} onChange={(event) => setDraft((current) => ({ ...current, audience: event.target.value }))} className="mt-1 min-h-10 w-full rounded-md border border-slate-200 px-3 text-sm" />
            </label>
            <label className="block md:col-span-2">
              <span className="text-sm font-medium text-slate-700">Nội dung quảng cáo</span>
              <textarea value={draft.creativeText} onChange={(event) => setDraft((current) => ({ ...current, creativeText: event.target.value }))} className="mt-1 min-h-28 w-full rounded-md border border-slate-200 px-3 py-2 text-sm" />
            </label>
          </div>
          <div className="mt-4 grid gap-2 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600 sm:grid-cols-2">
            <div><span className="font-semibold text-ink">Tài khoản:</span> {account?.name || accountId}</div>
            <div><span className="font-semibold text-ink">Sản phẩm:</span> {selectedProduct?.sku || "Chưa chọn"}</div>
            <div><span className="font-semibold text-ink">Ngân sách:</span> {money(draft.budgetDaily, account?.currency || "VND")}</div>
            <div><span className="font-semibold text-ink">Lịch chạy:</span> {draft.schedule || "Chưa chọn"}</div>
          </div>
          <button type="button" disabled={savingDraft} onClick={() => void createDraft()} className="mt-4 inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-brand-600 px-3 text-sm font-semibold text-white focus-ring disabled:cursor-not-allowed disabled:opacity-50">
            <Save className="h-4 w-4" aria-hidden="true" />
            {savingDraft ? "Đang xử lý..." : "Tạo draft quảng cáo"}
          </button>
        </section>
      ) : null}
    </div>
  );
}

function DataTable({ rows }: { rows: Record<string, unknown>[] }) {
  if (rows.length === 0) {
    return <div className="rounded-md border border-slate-200 bg-white p-4 text-sm text-slate-600 shadow-soft">Không có dữ liệu hoặc API đang bị chặn bởi permission.</div>;
  }
  const columns = Object.keys(rows[0] ?? {}).slice(0, 9);
  return (
    <div className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-soft">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>{columns.map((column) => <th key={column} className="px-4 py-3">{fieldLabels[column] || column}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row, index) => (
              <tr key={String(row.id ?? index)}>
                {columns.map((column) => (
                  <td key={column} className="max-w-[240px] truncate px-4 py-3">{cell(row[column])}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
