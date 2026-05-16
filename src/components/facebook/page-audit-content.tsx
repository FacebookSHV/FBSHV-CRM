"use client";

import { RefreshCcw, SearchCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/pages/page-header";
import { StatusPill } from "@/components/ui/status-pill";

type Finding = {
  id: string;
  category: string;
  severity: "info" | "warning" | "danger";
  title: string;
  recommendation: string;
};

type Audit = {
  id: string;
  pageId: string;
  pageName: string;
  score: number;
  summary: string;
  findings: Finding[];
  createdAt: string;
};

function severityTone(severity: Finding["severity"]) {
  if (severity === "danger") return "danger";
  if (severity === "warning") return "warning";
  return "info";
}

export function PageAuditContent() {
  const [audits, setAudits] = useState<Audit[]>([]);
  const [status, setStatus] = useState("Đang tải audit...");
  const [running, setRunning] = useState(false);

  async function loadAudits() {
    const response = await fetch("/api/page-audit", { cache: "no-store" });
    const payload = (await response.json()) as { success: boolean; data?: { audits: Audit[] }; error?: string };
    if (payload.success && payload.data) {
      setAudits(payload.data.audits);
      setStatus(payload.data.audits.length ? "Audit đã sẵn sàng." : "Chưa có audit, hãy chạy kiểm tra.");
    } else {
      setStatus(payload.error || "Không tải được audit.");
    }
  }

  async function runAudit() {
    setRunning(true);
    const response = await fetch("/api/page-audit/run", { method: "POST" });
    const payload = (await response.json()) as { success: boolean; error?: string };
    setStatus(payload.success ? "Đã chạy audit Page." : payload.error || "Chạy audit lỗi.");
    await loadAudits();
    setRunning(false);
  }

  useEffect(() => {
    void loadAudits();
  }, []);

  return (
    <div>
      <PageHeader
        title="Page Audit"
        subtitle="Kiểm tra độ sẵn sàng của Page, phản hồi khách và rủi ro lộ số điện thoại."
        action={
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void loadAudits()}
              className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-700 focus-ring"
              aria-label="Tải lại"
              title="Tải lại"
            >
              <RefreshCcw className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => void runAudit()}
              disabled={running}
              className="inline-flex min-h-10 items-center gap-2 rounded-md bg-brand-600 px-3 text-sm font-semibold text-white focus-ring disabled:opacity-50"
            >
              <SearchCheck className="h-4 w-4" aria-hidden="true" />
              Chạy audit
            </button>
          </div>
        }
      />

      <div className="mb-4 rounded-md border border-slate-200 bg-white p-3 text-sm text-slate-600 shadow-soft">
        {status}
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        {audits.map((audit) => (
          <article key={audit.id} className="rounded-md border border-slate-200 bg-white p-4 shadow-soft">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="truncate text-sm font-semibold text-ink">{audit.pageName || audit.pageId}</h2>
                <p className="mt-1 text-xs text-slate-500">{new Date(audit.createdAt).toLocaleString("vi-VN")}</p>
              </div>
              <div className="text-2xl font-semibold text-brand-700">{audit.score}</div>
            </div>
            <p className="mt-3 text-sm text-slate-600">{audit.summary}</p>
            <div className="mt-4 space-y-3">
              {audit.findings.map((finding) => (
                <div key={finding.id} className="rounded-md bg-slate-50 p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusPill tone={severityTone(finding.severity)}>{finding.category}</StatusPill>
                    <span className="text-sm font-medium text-ink">{finding.title}</span>
                  </div>
                  <p className="mt-2 text-sm text-slate-600">{finding.recommendation}</p>
                </div>
              ))}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
