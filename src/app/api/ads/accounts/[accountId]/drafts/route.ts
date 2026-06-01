import { z } from "zod";
import { fail, failFromError, ok } from "@/lib/api-response";
import { createAdDraft } from "@/lib/facebook/ads";

const createDraftSchema = z.object({
  sourcePostId: z.string().trim().max(200).optional(),
  name: z.string().trim().min(1).max(160).optional(),
  budgetDaily: z.coerce.number().int().min(0).max(1_000_000_000).optional(),
  objective: z.enum(["OUTCOME_ENGAGEMENT", "OUTCOME_TRAFFIC", "OUTCOME_SALES"]).optional(),
  schedule: z.string().trim().max(64).optional(),
  audience: z.string().trim().max(1_000).optional(),
  creativeText: z.string().trim().max(5_000).optional(),
  productSku: z.string().trim().max(200).optional()
});

export async function POST(
  request: Request,
  context: { params: Promise<{ accountId: string }> }
) {
  const { accountId } = await context.params;
  const parsed = createDraftSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return fail("Dữ liệu quảng cáo nháp không hợp lệ.", 400, "INVALID_AD_DRAFT");

  try {
    // NEO: Draft quảng cáo chỉ lưu nội bộ; ghi Meta thật luôn đi qua cờ an toàn và bước xác nhận riêng.
    return ok({ draft: await createAdDraft({ ...parsed.data, adAccountId: decodeURIComponent(accountId) }) });
  } catch (error) {
    return failFromError(error);
  }
}
