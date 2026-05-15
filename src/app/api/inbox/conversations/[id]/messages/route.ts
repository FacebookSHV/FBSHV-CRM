import { fail, failFromError, ok } from "@/lib/api-response";
import { getFacebookStore } from "@/lib/facebook/store";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  if (!id) return fail("Mã hội thoại không hợp lệ.");

  let store;
  try {
    store = await getFacebookStore();
  } catch (error) {
    return failFromError(error);
  }
  const conversation = await store.getConversation(id);
  if (!conversation) return fail("Không tìm thấy hội thoại.", 404);

  return ok({
    conversation,
    messages: await store.listMessages(id)
  });
}
