import { failFromError, ok } from "@/lib/api-response";
import { addContentPostTargets } from "@/lib/content-publishing";
import { createContentPost, listContentPosts } from "@/lib/content-planner";
import type { ContentPost } from "@/lib/content-planner";
import { queueContentPostImageflow } from "@/lib/content-imageflow";
import { getContentAutomationStatus } from "@/lib/content-runtime";

export async function GET() {
  try {
    const publishSettings = await getContentAutomationStatus();
    return ok({
      posts: await listContentPosts(),
      // NEO: UI phải biết cờ publish thật để không hiển thị nhầm trạng thái dry-run.
      publishSettings
    });
  } catch (error) {
    return failFromError(error);
  }
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown> & {
    autoCreateImageflow?: boolean;
    pageIds?: string[];
  };
  try {
    const post = await createContentPost(body as Partial<ContentPost>);
    const pageIds = Array.isArray(body.pageIds) && body.pageIds.length > 0 ? body.pageIds : [post.pageId];
    await addContentPostTargets(post.id, pageIds);

    let imageflowJob = null;
    let imageflowError: string | null = null;
    if (body.autoCreateImageflow !== false && post.productSku) {
      try {
        imageflowJob = await queueContentPostImageflow(post);
      } catch (error) {
        imageflowError = error instanceof Error ? error.message : "IMAGEFLOW_JOB_CREATE_FAILED";
      }
    }

    return ok({ post, pageIds, imageflowJob, imageflowError });
  } catch (error) {
    return failFromError(error);
  }
}
