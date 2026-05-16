import { AutomationContent } from "@/components/automation/automation-content";
import { listAutomationActions, listAutomationRules } from "@/lib/automation/rules";

export const dynamic = "force-dynamic";

export default async function AutomationPage() {
  const [rules, actions] = await Promise.all([listAutomationRules(), listAutomationActions()]);
  return <AutomationContent rules={rules} actions={actions} />;
}
