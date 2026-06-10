import { failFromError, ok } from "@/lib/api-response";
import { listIntegrationJobs } from "@/lib/integration/jobs-store";
import { processIntegrationJobs } from "@/lib/integration/processor";

function authorized(request: Request) {
  const expected = process.env.CONTENT_AUTOMATION_TOKEN || "";
  return Boolean(expected && request.headers.get("authorization") === `Bearer ${expected}`);
}

export async function GET(request: Request) {
  try {
    const limit = Number(new URL(request.url).searchParams.get("limit") || 50);
    return ok({ jobs: await listIntegrationJobs(limit) });
  } catch (error) {
    return failFromError(error);
  }
}

export async function POST(request: Request) {
  try {
    if (!authorized(request)) {
      return Response.json({ success: false, error: "INTEGRATION_PROCESSOR_UNAUTHORIZED" }, { status: 401 });
    }
    const body = (await request.json().catch(() => ({}))) as { maxJobs?: number; maxRuntimeMs?: number };
    return ok(await processIntegrationJobs({ maxJobs: body.maxJobs, maxRuntimeMs: body.maxRuntimeMs }));
  } catch (error) {
    return failFromError(error);
  }
}
