import { ModulePage } from "@/components/pages/module-page";
import { moduleSummaries } from "@/lib/demo-data";

export default function AutomationPage() {
  return (
    <ModulePage
      {...moduleSummaries.automation}
      note="Rule automation lưu hành động dự kiến, không thực hiện tác vụ ngoài khi thiếu secret."
    />
  );
}
