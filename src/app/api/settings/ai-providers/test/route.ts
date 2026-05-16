import { fail, failFromError, ok } from "@/lib/api-response";
import { generateAiText } from "@/lib/ai/provider";
import { listAiRuntimeKeys, slotForKeyName, updateAiProviderKeyTestStatus } from "@/lib/settings/ai-keys";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { keyName?: string; value?: string };
  if (!body.keyName || !slotForKeyName(body.keyName)) return fail("AI key slot không hợp lệ.", 400, "AI_KEY_SLOT_INVALID");

  try {
    const keyValue =
      body.value?.trim() ||
      (await listAiRuntimeKeys()).find((key) => key.keyName === body.keyName)?.value ||
      "";
    if (!keyValue) return fail("Không có full key để test. Hãy nhập key mới hoặc lưu key trong Settings.", 400, "AI_KEY_VALUE_REQUIRED");

    const result = await generateAiText({
      task: "caption",
      prompt: "Viết một câu test ngắn bằng tiếng Việt, không dùng emoji.",
      env: {
        [body.keyName]: keyValue,
        GEMINI_MODEL: process.env.GEMINI_MODEL,
        OPENAI_MODEL: process.env.OPENAI_MODEL
      }
    });
    const valid = result.mode === "ai";
    await updateAiProviderKeyTestStatus(body.keyName, valid ? "valid" : "failed", valid ? null : result.notice);
    return ok({
      valid,
      provider: result.provider,
      mode: result.mode,
      notice: result.notice || "AI key test thành công."
    });
  } catch (error) {
    await updateAiProviderKeyTestStatus(body.keyName, "failed", error instanceof Error ? error.message : "AI key test lỗi");
    return failFromError(error);
  }
}
