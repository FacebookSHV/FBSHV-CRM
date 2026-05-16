import { failFromError, ok } from "@/lib/api-response";
import { listAutomationRules } from "@/lib/automation/rules";

export async function GET() {
  try {
    return ok({ rules: await listAutomationRules() });
  } catch (error) {
    return failFromError(error);
  }
}
