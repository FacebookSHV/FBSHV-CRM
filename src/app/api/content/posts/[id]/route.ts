import { fail, failFromError, ok } from "@/lib/api-response";
import { updateContentPost } from "@/lib/content-planner";
import type { ContentPost } from "@/lib/content-planner";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  try {
    const post = await updateContentPost(id, body as Partial<ContentPost>);
    if (!post) return fail("Không tìm thấy bài viết.", 404, "CONTENT_POST_NOT_FOUND");
    return ok({ post });
  } catch (error) {
    return failFromError(error);
  }
}
