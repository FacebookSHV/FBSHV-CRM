import { failFromError, ok } from "@/lib/api-response";
import { listPublishJobs } from "@/lib/content-publishing";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  try {
    return ok({ jobs: await listPublishJobs(id) });
  } catch (error) {
    return failFromError(error);
  }
}
