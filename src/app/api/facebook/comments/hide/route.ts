import { fail, failFromError, ok } from "@/lib/api-response";
import { setFacebookCommentHidden } from "@/lib/facebook/operations";
import { hideCommentSchema } from "@/lib/facebook/validation";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = hideCommentSchema.safeParse(body);
  if (!parsed.success) return fail("Dữ liệu ẩn bình luận không hợp lệ.");

  let result;
  try {
    result = await setFacebookCommentHidden(parsed.data.commentId, parsed.data.hidden);
  } catch (error) {
    return failFromError(error);
  }
  return result.success ? ok(result.data) : fail(result.error, 400, "FACEBOOK_COMMENT_HIDE_FAILED");
}
