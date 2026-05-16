import { failFromError, ok } from "@/lib/api-response";
import { createAdDraft } from "@/lib/facebook/ads";

export async function POST(
  request: Request,
  context: { params: Promise<{ accountId: string }> }
) {
  const { accountId } = await context.params;
  const body = (await request.json().catch(() => ({}))) as {
    sourcePostId?: string;
    name?: string;
    budgetDaily?: number;
    objective?: string;
    schedule?: string;
    audience?: string;
    creativeText?: string;
    productSku?: string;
  };
  try {
    return ok({ draft: await createAdDraft({ ...body, adAccountId: decodeURIComponent(accountId) }) });
  } catch (error) {
    return failFromError(error);
  }
}
