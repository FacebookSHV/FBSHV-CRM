import { fail, failFromError, ok } from "@/lib/api-response";
import { createPublishJobs } from "@/lib/content-publishing";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const body = (await request.json().catch(() => ({}))) as {
    pageIds?: string[];
    scheduledAt?: string | null;
    publishNow?: boolean;
  };
  if (body.pageIds && !Array.isArray(body.pageIds)) return fail("pageIds phải là mảng.", 400, "PAGE_IDS_INVALID");

  try {
    const jobs = await createPublishJobs({
      postId: id,
      pageIds: body.pageIds ?? [],
      scheduledAt: body.scheduledAt ?? null,
      publishNow: body.publishNow ?? true
    });
    return ok({ jobs, dryRun: jobs.every((job) => job.dryRun) });
  } catch (error) {
    return failFromError(error);
  }
}
