import { fail, failFromError, ok } from "@/lib/api-response";
import { testAiRuntimeKey } from "@/lib/ai/provider";
import { listAiRuntimeKeys, maskAiKey, slotForKeyName, updateAiProviderKeyTestStatus } from "@/lib/settings/ai-keys";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { keyName?: string; value?: string; all?: boolean };

  try {
    if (body.all) {
      const keys = await listAiRuntimeKeys();
      if (keys.length === 0) return fail("Không có AI key đã lưu để test tất cả.", 400, "AI_KEY_VALUE_REQUIRED");
      const results = await Promise.all(keys.map((key) => testAiRuntimeKey(key)));
      await Promise.all(results.map((result) => updateAiProviderKeyTestStatus(result.keyName, result.status, result.valid ? null : result.message)));
      return ok({ results, tested: results.length });
    }

    if (!body.keyName || !slotForKeyName(body.keyName)) return fail("AI key slot không hợp lệ.", 400, "AI_KEY_SLOT_INVALID");
    const slot = slotForKeyName(body.keyName)!;
    const storedKey = (await listAiRuntimeKeys()).find((key) => key.keyName === body.keyName);
    const keyValue = body.value?.trim() || storedKey?.value || "";
    if (!keyValue) return fail("Không có full key để test. Hãy nhập key mới hoặc lưu key trong Settings.", 400, "AI_KEY_VALUE_REQUIRED");

    const result = await testAiRuntimeKey({
      provider: slot.provider,
      keyName: slot.keyName,
      value: keyValue,
      source: body.value?.trim() ? "settings" : storedKey?.source ?? "settings",
      masked: body.value?.trim() ? maskAiKey(keyValue) : storedKey?.masked ?? maskAiKey(keyValue)
    });
    await updateAiProviderKeyTestStatus(body.keyName, result.status, result.valid ? null : result.message);
    return ok(result);
  } catch (error) {
    if (body.keyName) await updateAiProviderKeyTestStatus(body.keyName, "unknown_error", error instanceof Error ? error.message : "AI key test lỗi");
    return failFromError(error);
  }
}
