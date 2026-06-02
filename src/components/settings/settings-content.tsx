"use client";

import { CheckCircle2, Cloud, KeyRound, PlugZap, RefreshCcw, ShieldAlert, TestTube2 } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/pages/page-header";
import { StatusPill } from "@/components/ui/status-pill";

type RuntimeStatus = {
  facebook: { mode: string; configured: boolean; missing: string[]; redirectUri: string; appId: string | null };
  ecommerce: { mode: string; configured: boolean; baseUrl: string | null };
  ai: {
    provider: string;
    configured: boolean;
    slots: Array<{ provider: "gemini" | "openai"; keyName: string }>;
    keys: Array<{ provider: string; keyName: string; source: string; masked: string; status: string; lastError?: string | null }>;
  };
  cloudflare: { worker: string; expectedAccountId: string; d1: boolean; r2: boolean; d1DatabaseName: string; r2BucketName: string };
  ads: {
    status: string;
    missingPermissions: string[];
    writeActionsEnabled: boolean;
    accountCount: number;
    businessSdk?: { installed: boolean; usable: boolean; provider: string; version: string | null; mode: string };
  };
  conversions: {
    configured: boolean;
    pixelConfigured: boolean;
    accessTokenConfigured: boolean;
    testEventCodeConfigured: boolean;
    provider: string;
    mode: string;
  };
  socialUx: { plannerReference: string; inboxReference: string; integratedInCrm: boolean };
  automation: { messageReplyEnabled: boolean; commentReplyEnabled: boolean; phoneHideEnabled: boolean };
  webhook: { verifyTokenConfigured: boolean; facebookCallback: string; facebookWebhook: string };
};

type AiTestResult = {
  valid: boolean;
  provider: string;
  keyName: string;
  masked?: string;
  status: string;
  message: string;
  model: string;
};

type ApiEnvelope<T> = { success: true; data: T } | { success: false; error?: string };

function tone(ok: boolean) {
  return ok ? "success" as const : "warning" as const;
}

function statusLabel(ok: boolean) {
  return ok ? "Đã cấu hình" : "Cần kiểm tra";
}

function runtimeModeLabel(mode: string) {
  if (mode === "mock") return "chưa kết nối thật";
  if (mode === "real") return "real";
  if (mode === "not_enabled") return "chưa bật";
  return mode;
}

export function SettingsContent() {
  const [status, setStatus] = useState<RuntimeStatus | null>(null);
  const [keys, setKeys] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("Đang tải cấu hình runtime...");
  const [testResults, setTestResults] = useState<AiTestResult[]>([]);

  async function loadStatus() {
    const response = await fetch("/api/settings/runtime", { cache: "no-store" });
    const payload = (await response.json().catch(() => null)) as ApiEnvelope<RuntimeStatus> | null;
    if (response.ok && payload?.success) {
      setStatus(payload.data);
      setMessage("Đã tải trạng thái cấu hình thật từ runtime.");
    } else {
      setMessage(payload && !payload.success ? payload.error ?? "Không tải được Settings." : "Không tải được Settings.");
    }
  }

  async function saveKey(keyName: string) {
    const value = keys[keyName]?.trim();
    if (!value) {
      setMessage(`Chưa nhập ${keyName}.`);
      return;
    }
    const response = await fetch("/api/settings/ai-providers", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ keyName, value })
    });
    const payload = (await response.json().catch(() => null)) as ApiEnvelope<{ masked: string }> | null;
    setMessage(response.ok && payload?.success ? `Đã lưu ${keyName} dạng mã hóa: ${payload.data.masked}.` : payload && !payload.success ? payload.error ?? "Lưu key lỗi." : "Lưu key lỗi.");
    if (response.ok) setKeys((current) => ({ ...current, [keyName]: "" }));
    await loadStatus();
  }

  async function testKey(keyName: string) {
    const response = await fetch("/api/settings/ai-providers/test", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ keyName, value: keys[keyName]?.trim() || undefined })
    });
    const payload = (await response.json().catch(() => null)) as ApiEnvelope<AiTestResult> | null;
    if (response.ok && payload?.success) {
      setTestResults([payload.data]);
      setMessage(`${payload.data.keyName} (${payload.data.masked ?? "masked"}): ${payload.data.status} - ${payload.data.message}`);
    } else {
      setMessage(payload && !payload.success ? payload.error ?? "Test key lỗi." : "Test key lỗi.");
    }
    await loadStatus();
  }

  async function testAllKeys() {
    const response = await fetch("/api/settings/ai-providers/test", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ all: true })
    });
    const payload = (await response.json().catch(() => null)) as ApiEnvelope<{ results: AiTestResult[]; tested: number }> | null;
    if (response.ok && payload?.success) {
      setTestResults(payload.data.results);
      const validCount = payload.data.results.filter((result) => result.valid).length;
      setMessage(`Đã test ${payload.data.tested} AI key: ${validCount} valid, ${payload.data.tested - validCount} lỗi có phân loại.`);
    } else {
      setMessage(payload && !payload.success ? payload.error ?? "Test tất cả key lỗi." : "Test tất cả key lỗi.");
    }
    await loadStatus();
  }

  useEffect(() => {
    void loadStatus();
  }, []);

  return (
    <div>
      <PageHeader
        title="Cài đặt hệ thống"
        subtitle="Theo dõi cấu hình Meta, Web Quản Lý TMĐT, AI Providers, Cloudflare runtime, Ads và webhook."
        action={
          <button type="button" onClick={() => void loadStatus()} className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-700 focus-ring" aria-label="Tải lại" title="Tải lại">
            <RefreshCcw className="h-4 w-4" aria-hidden="true" />
          </button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2 rounded-md border border-slate-200 bg-white p-3 shadow-soft">
        <StatusPill tone="info">Runtime status</StatusPill>
        <span className="text-sm text-slate-600">{message}</span>
      </div>

      {status ? (
        <>
          <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <StatusCard
              title="Facebook/Meta"
              icon={<PlugZap />}
              ok={status.facebook.configured}
              lines={[`Mode: ${runtimeModeLabel(status.facebook.mode)}`, `App ID: ${status.facebook.appId || "chưa có"}`, `Redirect: ${status.facebook.redirectUri}`, status.facebook.missing.length ? `Thiếu: ${status.facebook.missing.join(", ")}` : "Không thiếu biến bắt buộc"]}
            />
            <StatusCard
              title="Web Quản Lý TMĐT"
              icon={<CheckCircle2 />}
              ok={status.ecommerce.configured && status.ecommerce.mode === "real"}
              lines={[`Mode: ${runtimeModeLabel(status.ecommerce.mode)}`, `Base URL: ${status.ecommerce.baseUrl || "chưa có"}`]}
            />
            <StatusCard
              title="Cloudflare runtime"
              icon={<Cloud />}
              ok={status.cloudflare.d1 && status.cloudflare.r2}
              lines={[`Worker: ${status.cloudflare.worker}`, `Account: ${status.cloudflare.expectedAccountId}`, `D1 ${status.cloudflare.d1DatabaseName}: ${status.cloudflare.d1 ? "có binding" : "thiếu binding"}`, `R2 ${status.cloudflare.r2BucketName}: ${status.cloudflare.r2 ? "có binding" : "thiếu binding"}`]}
            />
            <StatusCard
              title="Quảng cáo Facebook"
              icon={<ShieldAlert />}
              ok={status.ads.status === "ready"}
              lines={[
                `Tài khoản đã kết nối: ${status.ads.accountCount}`,
                `Tạo quảng cáo thật: ${status.ads.writeActionsEnabled ? "đang bật, luôn tạo tạm dừng" : "đang chặn an toàn"}`,
                status.ads.businessSdk?.installed && status.ads.businessSdk.usable
                  ? `SDK Meta chính thức: đã cài ${status.ads.businessSdk.version}`
                  : status.ads.businessSdk?.installed
                    ? "SDK Meta chính thức: đã cài, Worker dùng Graph API trực tiếp"
                    : "SDK Meta chính thức: chưa cài",
                status.ads.missingPermissions.length ? "Cần kết nối lại quyền Ads" : "Quyền đọc Ads đang sẵn sàng"
              ]}
            />
            <StatusCard
              title="Pixel + CAPI"
              icon={<ShieldAlert />}
              ok={status.conversions.configured}
              lines={[
                `Trạng thái: ${status.conversions.configured ? "sẵn sàng gửi server-side" : "cần cấu hình Pixel/CAPI"}`,
                `Pixel: ${status.conversions.pixelConfigured ? "đã cấu hình" : "chưa có"}`,
                `CAPI token: ${status.conversions.accessTokenConfigured ? "đã cấu hình" : "chưa có"}`,
                `Test event: ${status.conversions.testEventCodeConfigured ? "đã bật" : "chưa bật"}`
              ]}
            />
            <StatusCard
              title="Trải nghiệm vận hành"
              icon={<CheckCircle2 />}
              ok={status.socialUx.integratedInCrm}
              lines={[
                "Lịch nội dung: đã đưa về luồng CRM theo mẫu Postiz/Mixpost",
                "Inbox CSKH: đã đưa về luồng CRM theo mẫu Chatwoot",
                "Không nhúng app ngoài, chỉ tích hợp capability vào CRM"
              ]}
            />
            <StatusCard
              title="Tự động Facebook"
              icon={<PlugZap />}
              ok={status.automation.messageReplyEnabled && status.automation.commentReplyEnabled && status.automation.phoneHideEnabled}
              lines={[
                `Auto reply Messenger: ${status.automation.messageReplyEnabled ? "live-write đang bật" : "đang tắt"}`,
                `Auto reply comment: ${status.automation.commentReplyEnabled ? "live-write đang bật" : "đang tắt"}`,
                `Tự ẩn số điện thoại: ${status.automation.phoneHideEnabled ? "live-write đang bật" : "đang tắt"}`
              ]}
            />
            <StatusCard
              title="Webhook"
              icon={<PlugZap />}
              ok={status.webhook.verifyTokenConfigured}
              lines={[`Verify token: ${status.webhook.verifyTokenConfigured ? "đã cấu hình" : "chưa có"}`, status.webhook.facebookWebhook, status.webhook.facebookCallback]}
            />
            <StatusCard
              title="AI Providers"
              icon={<KeyRound />}
              ok={status.ai.configured}
              lines={[`Provider ưu tiên: ${status.ai.provider}`, `Số key đã thấy: ${status.ai.keys.length}`]}
            />
          </section>

          <section className="mt-4 rounded-md border border-slate-200 bg-white p-4 shadow-soft">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-sm font-semibold text-ink">AI Providers</h2>
                <p className="mt-1 text-sm text-slate-600">Nhập GEMINI_API_KEY_1 đến GEMINI_API_KEY_5 hoặc OpenAI key. Key lưu vào D1 sẽ được mã hóa.</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <StatusPill tone={tone(status.ai.configured)}>{statusLabel(status.ai.configured)}</StatusPill>
                <button type="button" onClick={() => void testAllKeys()} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-slate-200 px-3 text-sm font-semibold text-slate-700 focus-ring">
                  <TestTube2 className="h-4 w-4" aria-hidden="true" />
                  Test tất cả key
                </button>
              </div>
            </div>

            <div className="mt-4 grid gap-3">
              {status.ai.slots.map((slot) => {
                const saved = status.ai.keys.find((key) => key.keyName === slot.keyName);
                return (
                  <div key={slot.keyName} className="grid gap-2 rounded-md border border-slate-200 p-3 lg:grid-cols-[180px_1fr_auto] lg:items-center">
                    <div>
                      <div className="text-sm font-semibold text-ink">{slot.keyName}</div>
                      <div className="text-xs text-slate-500">{slot.provider}</div>
                      {saved ? <div className="mt-1 text-xs text-slate-500">{saved.masked} · {saved.status}</div> : null}
                    </div>
                    <input
                      type="password"
                      value={keys[slot.keyName] ?? ""}
                      onChange={(event) => setKeys((current) => ({ ...current, [slot.keyName]: event.target.value }))}
                      className="min-h-11 rounded-md border border-slate-200 px-3 text-sm focus-ring"
                      placeholder="Dán key mới để test hoặc lưu"
                      autoComplete="off"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <button type="button" onClick={() => void testKey(slot.keyName)} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-slate-200 px-3 text-sm font-semibold text-slate-700 focus-ring">
                        <TestTube2 className="h-4 w-4" aria-hidden="true" />
                        Test
                      </button>
                      <button type="button" onClick={() => void saveKey(slot.keyName)} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-brand-600 px-3 text-sm font-semibold text-white focus-ring">
                        <KeyRound className="h-4 w-4" aria-hidden="true" />
                        Lưu
                      </button>
                    </div>
                    {saved?.lastError ? <div className="text-xs text-red-600 lg:col-span-3">{saved.lastError}</div> : null}
                  </div>
                );
              })}
            </div>

            {testResults.length > 0 ? (
              <div className="mt-4 grid gap-2">
                {testResults.map((result) => (
                  <div key={`${result.keyName}-${result.status}`} className="grid gap-2 rounded-md border border-slate-200 p-3 text-sm sm:grid-cols-[1fr_auto]">
                    <div>
                      <div className="font-semibold text-ink">{result.keyName} · {result.masked ?? "masked"} · {result.model}</div>
                      <div className="mt-1 text-slate-600">{result.message}</div>
                    </div>
                    <StatusPill tone={result.valid ? "success" : "danger"}>{result.status}</StatusPill>
                  </div>
                ))}
              </div>
            ) : null}
          </section>
        </>
      ) : null}
    </div>
  );
}

function StatusCard({ title, icon, ok, lines }: { title: string; icon: ReactNode; ok: boolean; lines: string[] }) {
  return (
    <article className="rounded-md border border-slate-200 bg-white p-4 shadow-soft">
      <div className="flex items-start justify-between gap-3">
        <span className="text-brand-600 [&>svg]:h-5 [&>svg]:w-5" aria-hidden="true">{icon}</span>
        <StatusPill tone={tone(ok)}>{statusLabel(ok)}</StatusPill>
      </div>
      <h2 className="mt-3 text-sm font-semibold text-ink">{title}</h2>
      <div className="mt-2 grid gap-1">
        {lines.map((line) => (
          <p key={line} className="break-words text-xs leading-5 text-slate-600">{line}</p>
        ))}
      </div>
    </article>
  );
}
