import { failFromError, ok } from "@/lib/api-response";
import { addContentPostTargets, isAutoPublishPostsEnabled } from "@/lib/content-publishing";
import { createContentPost, listContentPosts } from "@/lib/content-planner";
import type { ContentPost } from "@/lib/content-planner";
import { ensureImageflowJobForPost } from "@/lib/imageflow/store";

export async function GET() {
  try {
    return ok({
      posts: await listContentPosts(),
      // NEO: UI phải biết cờ publish thật để không hiển thị nhầm trạng thái dry-run.
      publishSettings: { autoPublishEnabled: isAutoPublishPostsEnabled() }
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
        imageflowJob = await ensureImageflowJobForPost({
          postId: post.id,
          productSku: post.productSku,
          title: `Anh bai dang - ${post.title}`,
          targetFormat: "facebook_feed",
          targetAspectRatio: "4:5",
          outputWidth: 1080,
          outputHeight: 1350,
          requestedCount: 4,
          promptJson: {
            source: "content_planner",
            postId: post.id,
            channel: "facebook",
            goal: "Tao anh bai dang ro san pham, de doc tren dien thoai, khong them thong tin ngoai du lieu that.",
            caption: post.caption,
            cta: post.cta
          }
        });
      } catch (error) {
        imageflowError = error instanceof Error ? error.message : "IMAGEFLOW_JOB_CREATE_FAILED";
      }
    }

    return ok({ post, pageIds, imageflowJob, imageflowError });
  } catch (error) {
    return failFromError(error);
  }
}
