import { fail, failFromError, ok } from "@/lib/api-response";
import { generateContentIdeas } from "@/lib/content-planner";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { limit?: number; pageId?: string };
  try {
    const result = await generateContentIdeas(body.limit ?? 7, body.pageId);
    return result.success ? ok({ ideas: result.data }) : fail(result.error);
  } catch (error) {
    return failFromError(error);
  }
}
