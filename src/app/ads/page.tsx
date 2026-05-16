import { PageHeader } from "@/components/pages/page-header";
import { StatusPill } from "@/components/ui/status-pill";
import { getAdsReadiness } from "@/lib/facebook/ads";

const requiredLater = ["business_management", "ads_read", "ads_management"];

export const dynamic = "force-dynamic";

export default async function AdsPage() {
  const readiness = await getAdsReadiness();
  return (
    <div>
      <PageHeader
        title="Facebook Ads readiness"
        subtitle="Theo dõi trạng thái chuẩn bị kết nối quảng cáo, chưa chạy hoặc chỉnh sửa chiến dịch thật."
      />
      <section className="rounded-md border border-slate-200 bg-white p-4 shadow-soft">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-ink">Tài khoản quảng cáo read-only</h2>
            <p className="mt-1 text-sm text-slate-600">
              {readiness.status === "blocked"
                ? `Thiếu quyền ${readiness.missingPermissions.join(", ")}. Chưa gọi Ads Graph API và chưa có dữ liệu ad account thật.`
                : readiness.status === "empty"
                  ? "Đã đủ quyền đọc nhưng chưa có ad account cache trong CRM."
                  : "Đã có dữ liệu ad account cache ở chế độ read-only."}
            </p>
          </div>
          <StatusPill tone={readiness.status === "ready" ? "success" : "warning"}>
            {readiness.status === "ready" ? "Read-only ready" : "Readiness"}
          </StatusPill>
        </div>
      </section>
      {readiness.accounts.length > 0 ? (
        <section className="mt-4 grid gap-3 md:grid-cols-2">
          {readiness.accounts.map((account) => (
            <article key={account.id} className="rounded-md border border-slate-200 bg-white p-4 shadow-soft">
              <h3 className="text-sm font-semibold text-ink">{account.name}</h3>
              <p className="mt-1 text-xs text-slate-500">{account.externalAccountId}</p>
              <div className="mt-3"><StatusPill tone="info">{account.status}</StatusPill></div>
            </article>
          ))}
        </section>
      ) : null}
      <section className="mt-4 grid gap-3 md:grid-cols-3">
        {requiredLater.map((scope) => (
          <article key={scope} className="rounded-md border border-slate-200 bg-white p-4 shadow-soft">
            <StatusPill tone="neutral">Giai đoạn sau</StatusPill>
            <h3 className="mt-3 text-sm font-semibold text-ink">{scope}</h3>
            <p className="mt-2 text-sm text-slate-600">
              Chỉ bật khi cần audit/quản trị quảng cáo thật và đã có Business permission hoặc Meta review phù hợp.
            </p>
          </article>
        ))}
      </section>
      <section className="mt-4 rounded-md border border-slate-200 bg-white p-4 shadow-soft">
        <h2 className="text-sm font-semibold text-ink">Write action</h2>
        <p className="mt-2 text-sm text-slate-600">
          {readiness.writeActionsEnabled
            ? "AD_WRITE_ACTIONS_ENABLED đang bật, vẫn cần ads_management và xác nhận UI trước khi ghi thật."
            : "AD_WRITE_ACTIONS_ENABLED đang tắt, mọi publish/pause/resume Ads sẽ bị chặn."}
        </p>
      </section>
    </div>
  );
}
