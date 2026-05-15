import { fail, failFromError, ok } from "@/lib/api-response";
import { sendMessengerReply } from "@/lib/facebook/operations";
import { sendMessageSchema } from "@/lib/facebook/validation";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = sendMessageSchema.safeParse(body);
  if (!parsed.success) return fail("Dữ liệu gửi tin nhắn không hợp lệ.");

  let result;
  try {
    result = await sendMessengerReply(parsed.data.conversationId, parsed.data.message);
  } catch (error) {
    return failFromError(error);
  }
  return result.success ? ok(result.data) : fail(result.error, 400, "FACEBOOK_MESSAGE_FAILED");
}
