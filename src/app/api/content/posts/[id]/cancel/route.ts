import { fail, failFromError, ok } from "@/lib/api-response";
import { cancelPublishJobs } from "@/lib/content-publishing";
import { cancelContentPost } from "@/lib/content-planner";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  try {
    const post = await cancelContentPost(id);
    if (!post) return fail("Không tìm thấy bài viết.", 404, "CONTENT_POST_NOT_FOUND");
    return ok({ post, jobs: await cancelPublishJobs(id) });
  } catch (error) {
    return failFromError(error);
  }
}
