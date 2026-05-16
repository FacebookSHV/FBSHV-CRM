import { fail, failFromError, ok } from "@/lib/api-response";
import { scheduleContentPost } from "@/lib/content-planner";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const body = (await request.json().catch(() => ({}))) as { scheduledAt?: string };
  if (!body.scheduledAt) return fail("Thiếu thời gian lên lịch.", 400, "SCHEDULED_AT_REQUIRED");
  try {
    const post = await scheduleContentPost(id, body.scheduledAt);
    if (!post) return fail("Không tìm thấy bài viết.", 404, "CONTENT_POST_NOT_FOUND");
    return ok({ post });
  } catch (error) {
    return failFromError(error);
  }
}
