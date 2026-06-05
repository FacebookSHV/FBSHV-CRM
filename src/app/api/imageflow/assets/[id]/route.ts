import { getCloudflareContext } from "@opennextjs/cloudflare";
import { fail } from "@/lib/api-response";
import { readImageflowAssetById } from "@/lib/imageflow/store";

type RouteContext = {
  params: Promise<{ id: string }>;
};

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
