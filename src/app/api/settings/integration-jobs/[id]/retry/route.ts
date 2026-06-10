import { fail, failFromError, ok } from "@/lib/api-response";
import { retryIntegrationJob } from "@/lib/integration/jobs-store";
import { isSameOriginMutation } from "@/lib/request-security";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: Params) {
  try {
    if (!isSameOriginMutation(request)) return fail("REQUEST_ORIGIN_NOT_ALLOWED", 403);
    const { id } = await context.params;
    const job = await retryIntegrationJob(id);
    return job ? ok({ job }) : fail("INTEGRATION_JOB_NOT_RETRYABLE", 409);
  } catch (error) {
    return failFromError(error);
  }
}
