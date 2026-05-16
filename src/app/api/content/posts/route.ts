import { failFromError, ok } from "@/lib/api-response";
import { addContentPostTargets } from "@/lib/content-publishing";
import { createContentPost, listContentPosts } from "@/lib/content-planner";
import type { ContentPost } from "@/lib/content-planner";

export async function GET() {
  try {
    return ok({ posts: await listContentPosts() });
  } catch (error) {
    return failFromError(error);
  }
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown> & { pageIds?: string[] };
  try {
    const post = await createContentPost(body as Partial<ContentPost>);
    const pageIds = Array.isArray(body.pageIds) && body.pageIds.length > 0 ? body.pageIds : [post.pageId];
    await addContentPostTargets(post.id, pageIds);
    return ok({ post, pageIds });
  } catch (error) {
    return failFromError(error);
  }
}
