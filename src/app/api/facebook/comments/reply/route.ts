import { fail, failFromError, ok } from "@/lib/api-response";
import { replyFacebookComment } from "@/lib/facebook/operations";
import { replyCommentSchema } from "@/lib/facebook/validation";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = replyCommentSchema.safeParse(body);
  if (!parsed.success) return fail("Dữ liệu trả lời bình luận không hợp lệ.");

  let result;
  try {
    result = await replyFacebookComment(parsed.data.commentId, parsed.data.message);
  } catch (error) {
    return failFromError(error);
  }
  return result.success ? ok(result.data) : fail(result.error, 400, "FACEBOOK_COMMENT_REPLY_FAILED");
}
