import { Bot, EyeOff, MessageSquareReply } from "lucide-react";
import { PageHeader } from "@/components/pages/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusPill } from "@/components/ui/status-pill";
import type { AutomationActionView, AutomationRuleView } from "@/lib/automation/rules";

type AutomationContentProps = {
  rules: AutomationRuleView[];
  actions: AutomationActionView[];
};

const iconByAction: Record<string, typeof MessageSquareReply> = {
  auto_reply_message: MessageSquareReply,
  auto_reply_comment: MessageSquareReply,
  auto_hide_phone_comment: EyeOff
};

function toneForStatus(status: string) {
  if (status === "sent" || status === "hidden") return "success" as const;
  if (status === "blocked" || status === "failed") return "danger" as const;
  if (status === "skipped") return "warning" as const;
  return "info" as const;
}

export function AutomationContent({ rules, actions }: AutomationContentProps) {
  return (
    <div>
      <PageHeader
        title="Automation"
        subtitle="Rule thật cho auto reply inbox/comment và ẩn bình luận chứa số điện thoại."
      />

      <div className="mb-4 flex flex-wrap items-center gap-2 rounded-md border border-slate-200 bg-white p-3 shadow-soft">
        <StatusPill tone="success">D1 rules</StatusPill>
        <StatusPill tone="warning">Không gửi trùng cùng event/comment</StatusPill>
        <span className="text-sm text-slate-600">Thiếu quyền Meta sẽ trả BLOCKED_META_PERMISSION_MISSING.</span>
      </div>

      <section className="grid gap-3 md:grid-cols-3">
        {rules.map((rule) => {
          const Icon = iconByAction[rule.actionTypes[0] ?? ""] ?? Bot;
          return (
            <article key={rule.id} className="rounded-md border border-slate-200 bg-white p-4 shadow-soft">
              <div className="flex items-start justify-between gap-3">
                <Icon className="h-5 w-5 text-brand-600" aria-hidden="true" />
                <StatusPill tone={rule.active && rule.runtimeEnabled ? "success" : "warning"}>
                  {rule.active && rule.runtimeEnabled ? "Đang bật" : "Chưa chạy"}
                </StatusPill>
              </div>
              <h2 className="mt-3 text-sm font-semibold text-ink">{rule.name}</h2>
              <p className="mt-2 text-sm text-slate-600">Trigger: {rule.triggerType}</p>
              <p className="mt-1 text-xs text-slate-500">Action: {rule.actionTypes.join(", ") || "Chưa cấu hình"}</p>
            </article>
          );
        })}
      </section>

      <section className="mt-4 rounded-md border border-slate-200 bg-white shadow-soft">
        <div className="border-b border-slate-200 px-4 py-3">
          <h2 className="text-sm font-semibold text-ink">Lịch sử chạy automation</h2>
        </div>
        {actions.length === 0 ? (
          <div className="p-4">
            <EmptyState
              title="Chưa có action thật"
              description="Action sẽ xuất hiện khi webhook Facebook phát sinh inbox/comment và rule được bật bằng env."
            />
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {actions.map((action) => (
              <article key={action.id} className="grid gap-2 p-4 md:grid-cols-[1fr_auto] md:items-center">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-semibold text-ink">{action.actionType}</h3>
                    <StatusPill tone={toneForStatus(action.status)}>{action.status}</StatusPill>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">Event {action.eventId}</p>
                  {action.error ? <p className="mt-1 text-xs text-red-600">{action.error}</p> : null}
                </div>
                <div className="text-xs text-slate-500">{new Date(action.updatedAt).toLocaleString("vi-VN")}</div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
