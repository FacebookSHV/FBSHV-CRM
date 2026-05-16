import { failFromError, ok } from "@/lib/api-response";
import { listAutomationActions } from "@/lib/automation/rules";

export async function GET() {
  try {
    return ok({ actions: await listAutomationActions() });
  } catch (error) {
    return failFromError(error);
  }
}
