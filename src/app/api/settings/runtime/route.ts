import { failFromError, ok } from "@/lib/api-response";
import { getRuntimeSettingsStatus } from "@/lib/settings/runtime-status";

export async function GET() {
  try {
    return ok(await getRuntimeSettingsStatus());
  } catch (error) {
    return failFromError(error);
  }
}
