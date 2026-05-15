import { ModulePage } from "@/components/pages/module-page";
import { moduleSummaries } from "@/lib/demo-data";

export default function ReportsPage() {
  return (
    <ModulePage
      {...moduleSummaries.reports}
      note="Báo cáo dùng dữ liệu demo và có thể thay bằng dữ liệu D1 sau khi sync thật."
    />
  );
}
