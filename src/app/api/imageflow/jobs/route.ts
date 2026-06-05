import { z } from "zod";
import { fail, failFromError, ok } from "@/lib/api-response";
import { createImageflowJob, listImageflowJobs } from "@/lib/imageflow/store";

const createJobSchema = z.object({
  postId: z.string().trim().max(160).nullable().optional(),
  productSku: z.string().trim().min(1).max(160),
  title: z.string().trim().max(220).optional(),
  targetFormat: z.string().trim().max(80).optional(),
  targetAspectRatio: z.string().trim().max(16).optional(),
  outputWidth: z.number().int().min(512).max(4096).optional(),
  outputHeight: z.number().int().min(512).max(4096).optional(),
  requestedCount: z.number().int().min(1).max(10).optional(),
  promptJson: z.unknown().optional(),
  productContextJson: z.unknown().optional()
});

export async function GET(request: Request) {
  const url = new URL(request.url);
  const limit = Number(url.searchParams.get("limit") ?? 50);
  return ok({ jobs: await listImageflowJobs(limit) });
}

export async function POST(request: Request) {
  const parsed = createJobSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return fail("Dữ liệu tạo job ImageFlow không hợp lệ.", 400, "INVALID_IMAGEFLOW_JOB");
  try {
    return ok(await createImageflowJob(parsed.data));
  } catch (error) {
    return failFromError(error);
  }
}
