import { fail, failFromError, ok } from "@/lib/api-response";
import { replaceContentPostTargets } from "@/lib/content-publishing";
import { deleteContentPost, updateContentPost } from "@/lib/content-planner";
import type { ContentPost } from "@/lib/content-planner";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown> & { pageIds?: string[] };
  try {
    const post = await updateContentPost(id, body as Partial<ContentPost>);
    if (!post) return fail("Không tìm thấy bài viết.", 404, "CONTENT_POST_NOT_FOUND");
    const pageIds = Array.isArray(body.pageIds) && body.pageIds.length > 0 ? body.pageIds : [post.pageId];
    await replaceContentPostTargets(id, pageIds);
    return ok({ post, pageIds });
  } catch (error) {
    return failFromError(error);
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  try {
    const result = await deleteContentPost(id);
    if (!result.deleted) {
      const message =
        result.error === "CONTENT_POST_DELETE_NOT_ALLOWED"
          ? "Chỉ được xóa bài draft hoặc scheduled, không xóa bài đã publish."
          : "Không tìm thấy bài viết.";
      return fail(message, result.error === "CONTENT_POST_DELETE_NOT_ALLOWED" ? 400 : 404, result.error);
    }
    return ok({ deleted: true });
  } catch (error) {
    return failFromError(error);
  }
}
