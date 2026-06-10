import { getCloudflareContext } from "@opennextjs/cloudflare";
import { z } from "zod";
import { fail, failFromError, ok } from "@/lib/api-response";
import { readImageflowAssetById, updateImageflowAssetStatus } from "@/lib/imageflow/store";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const reviewSchema = z.object({
  status: z.enum(["needs_review", "approved", "rejected"])
});

async function getBucket() {
  try {
    const context = await getCloudflareContext({ async: true });
    return (context.env as { BUCKET?: R2Bucket }).BUCKET;
  } catch {
    return undefined;
  }
}

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const asset = await readImageflowAssetById(id);
  if (!asset?.r2Key) return fail("Không tìm thấy ảnh ImageFlow.", 404, "IMAGEFLOW_ASSET_NOT_FOUND");

  const bucket = await getBucket();
  if (!bucket) return fail("Thiếu R2 BUCKET để đọc ảnh ImageFlow.", 400, "BLOCKED_BY_MISSING_BINDING");

  const object = await bucket.get(asset.r2Key);
  if (!object) return fail("Ảnh ImageFlow không còn trong R2.", 404, "IMAGEFLOW_R2_OBJECT_NOT_FOUND");

  return new Response(object.body, {
    headers: {
      "content-type": asset.mimeType,
      "cache-control": "public, max-age=31536000, immutable"
    }
  });
}

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;
  try {
    const parsed = reviewSchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) return fail("Trạng thái duyệt ảnh không hợp lệ.", 400, "INVALID_IMAGEFLOW_ASSET_REVIEW");
    return ok(await updateImageflowAssetStatus(id, parsed.data.status));
  } catch (error) {
    return failFromError(error);
  }
}
