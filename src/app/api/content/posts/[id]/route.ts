import { fail, failFromError, ok } from "@/lib/api-response";
import { replaceContentPostTargets } from "@/lib/content-publishing";
import { deleteContentPost, listContentPosts, updateContentPost } from "@/lib/content-planner";
import { listPublishJobs } from "@/lib/content-publishing";
import { deletePagePost } from "@/lib/facebook/publishing";
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
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const scope = new URL(request.url).searchParams.get("scope");
  const crmOnly = scope === "crm";
  try {
    if (scope === "facebook") {
      const post = (await listContentPosts()).find((item) => item.id === id);
      if (!post) return fail("Không tìm thấy bài viết.", 404, "CONTENT_POST_NOT_FOUND");
      const publishedJob = (await listPublishJobs(id)).find((job) => job.externalPostId);
      if (!publishedJob?.externalPostId) {
        return fail("Bài chưa có Meta post ID để xóa.", 400, "META_POST_ID_MISSING");
      }
      await deletePagePost({ pageId: publishedJob.pageId || post.pageId, externalPostId: publishedJob.externalPostId });
      const result = await deleteContentPost(id, { crmOnly: true });
      return ok({ deleted: result.deleted, scope: "facebook", externalPostId: publishedJob.externalPostId });
    }
    const result = await deleteContentPost(id, { crmOnly });
    if (!result.deleted) {
      const message =
        result.error === "CONTENT_POST_DELETE_NOT_ALLOWED"
          ? "Bài này cần xác nhận xoá khỏi CRM. Bài thật trên Facebook sẽ không bị xoá."
          : "Không tìm thấy bài viết.";
      return fail(message, result.error === "CONTENT_POST_DELETE_NOT_ALLOWED" ? 400 : 404, result.error);
    }
    return ok({ deleted: true, scope: crmOnly ? "crm" : "draft_or_scheduled" });
  } catch (error) {
    return failFromError(error);
  }
}
