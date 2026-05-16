import { PageHeader } from "@/components/pages/page-header";
import { StatusPill } from "@/components/ui/status-pill";

const requiredLater = ["business_management", "ads_read", "ads_management"];

export default function AdsPage() {
  return (
    <div>
      <PageHeader
        title="Facebook Ads readiness"
        subtitle="Theo dõi trạng thái chuẩn bị kết nối quảng cáo, chưa chạy hoặc chỉnh sửa chiến dịch thật."
      />
      <section className="rounded-md border border-slate-200 bg-white p-4 shadow-soft">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-ink">Tài khoản quảng cáo</h2>
            <p className="mt-1 text-sm text-slate-600">
              Chưa kết nối read-only. OAuth hiện tại không xin quyền ads để tránh vượt phạm vi Meta review.
            </p>
          </div>
          <StatusPill tone="warning">Not connected</StatusPill>
        </div>
      </section>
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
    </div>
  );
}
