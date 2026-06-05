import { failFromError, ok } from "@/lib/api-response";
import { requireImageflowBridgeAuth } from "@/lib/imageflow/auth";
import { claimNextImageflowJob } from "@/lib/imageflow/store";

export async function POST(request: Request) {
  try {
    await requireImageflowBridgeAuth(request);
    const body = (await request.json().catch(() => ({}))) as { workerId?: unknown };
    const workerId = typeof body.workerId === "string" ? body.workerId : "local-imageflow";
    return ok({ job: await claimNextImageflowJob(workerId) });
  } catch (error) {
    return failFromError(error);
  }
}
