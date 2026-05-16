import { fail, failFromError, ok } from "@/lib/api-response";
import { listContentMedia, uploadContentMedia } from "@/lib/content-media";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  try {
    return ok({ media: await listContentMedia(id) });
  } catch (error) {
    return failFromError(error);
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return fail("Thiếu file media.", 400, "MEDIA_FILE_REQUIRED");
    return ok({ media: await uploadContentMedia(id, file) });
  } catch (error) {
    return failFromError(error);
  }
}
