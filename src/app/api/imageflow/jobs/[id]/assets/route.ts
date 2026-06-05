import { fail, failFromError, ok } from "@/lib/api-response";
import { requireImageflowBridgeAuth } from "@/lib/imageflow/auth";
import { saveImageflowAsset } from "@/lib/imageflow/store";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;
  try {
    await requireImageflowBridgeAuth(request);
    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) return fail("Cần gửi file ảnh ImageFlow.", 400, "IMAGEFLOW_FILE_REQUIRED");

    const asset = await saveImageflowAsset(id, {
      file,
      assetIndex: Number(formData.get("assetIndex") ?? 0),
      role: String(formData.get("role") ?? "album_image"),
      promptJson: formData.get("promptJson") ? String(formData.get("promptJson")) : undefined
    });
    return ok(asset);
  } catch (error) {
    return failFromError(error);
  }
}
