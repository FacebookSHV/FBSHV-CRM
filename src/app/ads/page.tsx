import { ModulePage } from "@/components/pages/module-page";
import { moduleSummaries } from "@/lib/demo-data";

export default function AdsPage() {
  return (
    <ModulePage
      {...moduleSummaries.ads}
      note="Chỉ số ads dùng seed/mock để dựng khung, chưa gọi Facebook nếu thiếu token."
    />
  );
}
