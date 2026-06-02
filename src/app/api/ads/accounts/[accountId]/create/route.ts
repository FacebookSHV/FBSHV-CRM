import { z } from "zod";
import { fail, failFromError, ok } from "@/lib/api-response";
import { createAdDraft, isAdsWriteActionsEnabled, publishAdDraft } from "@/lib/facebook/ads";

const optionalUrl = z.preprocess(
  (value) => typeof value === "string" && value.trim() === "" ? undefined : value,
  z.string().trim().url().max(500).optional()
);

const createLiveAdSchema = z.object({
  draftId: z.string().trim().min(1).max(200).optional(),
  pageId: z.string().trim().max(200).optional(),
  sourcePostId: z.string().trim().max(200).optional(),
  name: z.string().trim().min(1).max(160).optional(),
  budgetDaily: z.coerce.number().int().min(1).max(1_000_000_000).optional(),
  objective: z.enum(["OUTCOME_ENGAGEMENT", "OUTCOME_TRAFFIC", "OUTCOME_SALES"]).optional(),
  schedule: z.string().trim().max(64).optional(),
  audience: z.string().trim().max(1_000).optional(),
  creativeText: z.string().trim().max(5_000).optional(),
  productSku: z.string().trim().max(200).optional(),
  destinationUrl: optionalUrl
});

export async function POST(
  request: Request,
  context: { params: Promise<{ accountId: string }> }
) {
  const { accountId } = await context.params;
  const parsed = createLiveAdSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return fail("Dữ liệu quảng cáo thật không hợp lệ.", 400, "INVALID_AD_LIVE_WRITE");
  const body = parsed.data;
  if (!(await isAdsWriteActionsEnabled())) {
    return fail("Ads write đang bị chặn bởi AD_WRITE_ACTIONS_ENABLED=false. Hãy tạo draft nội bộ thay vì gọi Meta write.", 400, "AD_WRITE_ACTIONS_DISABLED");
  }
  try {
    const draft = body.draftId ? { id: body.draftId } : await createAdDraft({ ...body, adAccountId: decodeURIComponent(accountId) });
    return ok(await publishAdDraft(draft.id));
  } catch (error) {
    return failFromError(error);
  }
}
