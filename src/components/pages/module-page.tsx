import { StatusPill } from "@/components/ui/status-pill";
import { PageHeader } from "./page-header";

type ModulePageProps = {
  title: string;
  subtitle: string;
  rows: string[];
  note: string;
};

export function ModulePage({ title, subtitle, rows, note }: ModulePageProps) {
  return (
    <div>
      <PageHeader title={title} subtitle={subtitle} />
      <div className="grid gap-4 lg:grid-cols-[1.4fr_0.8fr]">
        <section className="rounded-md border border-slate-200 bg-white shadow-soft">
          <div className="border-b border-slate-200 px-4 py-3">
            <h2 className="text-sm font-semibold text-ink">Danh sách module</h2>
          </div>
          <div className="divide-y divide-slate-100">
            {rows.map((row, index) => (
              <article
                key={row}
                className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <div className="font-medium text-ink">{row}</div>
                  <div className="mt-1 text-sm text-slate-500">
                    Mục #{index + 1} trong dữ liệu khung MVP.
                  </div>
                </div>
                <StatusPill tone={index === 0 ? "success" : "neutral"}>
                  {index === 0 ? "Đang hoạt động" : "Chưa kết nối"}
                </StatusPill>
              </article>
            ))}
          </div>
        </section>
        <section className="rounded-md border border-slate-200 bg-white p-4 shadow-soft">
          <h2 className="text-sm font-semibold text-ink">Trạng thái tích hợp</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">{note}</p>
          <div className="mt-4 rounded-md bg-slate-50 p-3 text-sm text-slate-600">
            Dữ liệu mô phỏng chỉ dùng khi chưa cấu hình kết nối thật trong môi trường hiện tại.
          </div>
        </section>
      </div>
    </div>
  );
}
