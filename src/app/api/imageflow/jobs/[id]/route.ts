import { z } from "zod";
import { fail, failFromError, ok } from "@/lib/api-response";
import { requireImageflowBridgeAuth } from "@/lib/imageflow/auth";
import { getImageflowJob, updateImageflowJob } from "@/lib/imageflow/store";

const patchSchema = z.object({
  status: z.enum(["queued", "running", "needs_user", "completed", "failed", "cancelled"]).optional(),
  error: z.string().max(2000).nullable().optional(),
  resultManifestJson: z.unknown().optional()
});

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const job = await getImageflowJob(id);
  return job ? ok(job) : fail("Không tìm thấy job ImageFlow.", 404, "IMAGEFLOW_JOB_NOT_FOUND");
}

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;
  try {
    await requireImageflowBridgeAuth(request);
    const parsed = patchSchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) return fail("Dữ liệu cập nhật job ImageFlow không hợp lệ.", 400, "INVALID_IMAGEFLOW_JOB_PATCH");
    return ok(await updateImageflowJob(id, parsed.data));
  } catch (error) {
    return failFromError(error);
  }
}
