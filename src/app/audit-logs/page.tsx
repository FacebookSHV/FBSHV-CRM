import { ModulePage } from "@/components/pages/module-page";
import { moduleSummaries } from "@/lib/demo-data";

export default function AuditLogsPage() {
  return (
    <ModulePage
      {...moduleSummaries.auditLogs}
      note="Các hành động quan trọng và webhook TMĐT có schema audit riêng."
    />
  );
}
