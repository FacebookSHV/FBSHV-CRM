import { fail, failFromError, ok } from "@/lib/api-response";
import { createAdDraft, publishAdDraft } from "@/lib/facebook/ads";

export async function POST(
  request: Request,
  context: { params: Promise<{ accountId: string }> }
) {
  const { accountId } = await context.params;
  const body = (await request.json().catch(() => ({}))) as { draftId?: string; name?: string; budgetDaily?: number };
  if (process.env.AD_WRITE_ACTIONS_ENABLED !== "true") {
    return fail("Ads write đang bị chặn bởi AD_WRITE_ACTIONS_ENABLED=false. Hãy tạo draft nội bộ thay vì gọi Meta write.", 400, "AD_WRITE_ACTIONS_DISABLED");
  }
  try {
    const draft = body.draftId ? { id: body.draftId } : await createAdDraft({ ...body, adAccountId: decodeURIComponent(accountId) });
    return ok(await publishAdDraft(draft.id));
  } catch (error) {
    return failFromError(error);
  }
}
