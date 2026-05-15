import { ModulePage } from "@/components/pages/module-page";
import { moduleSummaries } from "@/lib/demo-data";

export default function SettingsPage() {
  return (
    <ModulePage
      {...moduleSummaries.settings}
      note="Secret chỉ lấy từ environment/Cloudflare, không hard-code trong source."
    />
  );
}
