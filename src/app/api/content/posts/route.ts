import { failFromError, ok } from "@/lib/api-response";
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
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  try {
    return ok({ post: await createContentPost(body as Partial<ContentPost>) });
  } catch (error) {
    return failFromError(error);
  }
}
