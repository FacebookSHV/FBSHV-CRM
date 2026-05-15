import { ModulePage } from "@/components/pages/module-page";
import { moduleSummaries } from "@/lib/demo-data";

export default function CrmPage() {
  return (
    <ModulePage
      {...moduleSummaries.crm}
      note="Khách hàng được quản lý theo workspace, tag và lịch sử tương tác."
    />
  );
}
