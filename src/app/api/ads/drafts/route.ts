import { failFromError, ok } from "@/lib/api-response";
import { createAdDraft } from "@/lib/facebook/ads";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    sourcePostId?: string;
    adAccountId?: string;
    name?: string;
    budgetDaily?: number;
  };
  try {
    return ok({ draft: await createAdDraft(body) });
  } catch (error) {
    return failFromError(error);
  }
}
