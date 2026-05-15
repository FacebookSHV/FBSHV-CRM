"use client";

import { CheckCircle2, Plug, RefreshCcw, ShieldAlert, Unplug } from "lucide-react";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/pages/page-header";
import { StatusPill } from "@/components/ui/status-pill";

type FacebookPage = {
  id: string;
  externalPageId: string;
  name: string;
  status: "connected" | "disconnected" | "mock" | "error";
  tokenStatus: "valid" | "missing" | "expired" | "revoked" | "mock";
  subscribedWebhook: boolean;
  pictureUrl?: string | null;
  syncedAt?: string | null;
};

type PagesResponse = {
  success: true;
  data: {
    mode: "mock" | "real";
    missing: string[];
    pages: FacebookPage[];
  };
};

function tokenTone(status: FacebookPage["tokenStatus"]) {
  if (status === "valid" || status === "mock") return "success";
  if (status === "missing") return "warning";
  return "danger";
}

export function FanpagesContent() {
  const [mode, setMode] = useState<"mock" | "real">("mock");
  const [missing, setMissing] = useState<string[]>([]);
  const [pages, setPages] = useState<FacebookPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadPages() {
    setLoading(true);
    setError(null);
    const response = await fetch("/api/facebook/pages", { cache: "no-store" });
    const payload = (await response.json()) as PagesResponse;
    if (!payload.success) {
      setError("Không tải được danh sách fanpage.");
      setLoading(false);
      return;
    }
    setMode(payload.data.mode);
    setMissing(payload.data.missing);
    setPages(payload.data.pages);
    setLoading(false);
  }

  async function subscribe(pageId: string) {
    setBusyId(pageId);
    setError(null);
    const response = await fetch(`/api/facebook/pages/${encodeURIComponent(pageId)}/subscribe`, {
      method: "POST"
    });
    const payload = (await response.json()) as { success: boolean; error?: string };
    if (!payload.success) setError(payload.error || "Subscribe webhook thất bại.");
    await loadPages();
    setBusyId(null);
  }

  async function disconnect(pageId: string) {
    setBusyId(pageId);
    setError(null);
    const response = await fetch("/api/facebook/disconnect", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ pageId })
    });
    const payload = (await response.json()) as { success: boolean; error?: string };
    if (!payload.success) setError(payload.error || "Ngắt kết nối thất bại.");
    await loadPages();
    setBusyId(null);
  }

  useEffect(() => {
    void loadPages();
  }, []);

  return (
    <div>
      <PageHeader
        title="Fanpage"
        subtitle="Kết nối Facebook Page, theo dõi token và trạng thái webhook."
        action={
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void loadPages()}
              className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-700 focus-ring"
              aria-label="Tải lại"
              title="Tải lại"
            >
              <RefreshCcw className="h-4 w-4" aria-hidden="true" />
            </button>
            <a
              href="/api/facebook/connect"
              className="inline-flex min-h-10 items-center gap-2 rounded-md bg-brand-600 px-3 text-sm font-semibold text-white focus-ring hover:bg-brand-700"
            >
              <Plug className="h-4 w-4" aria-hidden="true" />
              Connect Facebook
            </a>
          </div>
        }
      />

      <section className="mb-4 rounded-md border border-slate-200 bg-white p-4 shadow-soft">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-sm font-semibold text-ink">Trạng thái tích hợp</div>
            <div className="mt-1 text-sm text-slate-600">
              {mode === "mock" ? "Đang dùng mock Facebook, không gọi Meta thật." : "Đang dùng cấu hình Meta thật."}
            </div>
          </div>
          <StatusPill tone={mode === "mock" ? "warning" : "success"}>{mode === "mock" ? "Mock" : "Real"}</StatusPill>
        </div>
        {missing.length > 0 ? (
          <div className="mt-3 flex gap-2 rounded-md bg-amber-50 p-3 text-sm text-amber-800">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>Thiếu cấu hình thật: {missing.join(", ")}</span>
          </div>
        ) : null}
        {error ? <div className="mt-3 rounded-md bg-rose-50 p-3 text-sm text-rose-700">{error}</div> : null}
      </section>

      <section className="rounded-md border border-slate-200 bg-white shadow-soft">
        <div className="border-b border-slate-200 px-4 py-3">
          <h2 className="text-sm font-semibold text-ink">Danh sách page</h2>
        </div>
        {loading ? (
          <div className="p-4 text-sm text-slate-500">Đang tải...</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {pages.map((page) => (
              <article key={page.id} className="grid gap-3 p-4 md:grid-cols-[1fr_auto] md:items-center">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="truncate text-sm font-semibold text-ink">{page.name}</h3>
                    <StatusPill tone={tokenTone(page.tokenStatus)}>{page.tokenStatus}</StatusPill>
                    <StatusPill tone={page.subscribedWebhook ? "success" : "warning"}>
                      {page.subscribedWebhook ? "Webhook bật" : "Webhook tắt"}
                    </StatusPill>
                  </div>
                  <div className="mt-1 text-xs text-slate-500">Page ID: {page.externalPageId}</div>
                  <div className="mt-1 text-xs text-slate-500">
                    Sync: {page.syncedAt ? new Date(page.syncedAt).toLocaleString("vi-VN") : "Chưa có"}
                  </div>
                </div>
                <div className="flex gap-2 md:justify-end">
                  <button
                    type="button"
                    onClick={() => void subscribe(page.id)}
                    disabled={busyId === page.id}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-emerald-200 text-emerald-700 focus-ring disabled:opacity-50"
                    aria-label="Subscribe webhook"
                    title="Subscribe webhook"
                  >
                    <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => void disconnect(page.id)}
                    disabled={busyId === page.id}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-slate-200 text-slate-700 focus-ring disabled:opacity-50"
                    aria-label="Ngắt kết nối"
                    title="Ngắt kết nối"
                  >
                    <Unplug className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
