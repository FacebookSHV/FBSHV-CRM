import { fail, failFromError, ok } from "@/lib/api-response";
import { listAiProviderPublicStatus, saveAiProviderKey, slotForKeyName } from "@/lib/settings/ai-keys";

export async function GET() {
  try {
    return ok(await listAiProviderPublicStatus());
  } catch (error) {
    return failFromError(error);
  }
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { keyName?: string; value?: string };
  if (!body.keyName || !slotForKeyName(body.keyName)) return fail("AI key slot không hợp lệ.", 400, "AI_KEY_SLOT_INVALID");
  if (!body.value?.trim()) return fail("Chưa nhập AI key.", 400, "AI_KEY_EMPTY");

  try {
    // NEO: Key nhập từ Settings được mã hóa trước khi lưu D1, không trả full key về client.
    return ok(await saveAiProviderKey({ keyName: body.keyName, value: body.value }));
  } catch (error) {
    return failFromError(error);
  }
}
