import { failFromError, ok } from "@/lib/api-response";
import { listAdAccountCampaigns } from "@/lib/facebook/ads";

export async function GET(
  _request: Request,
  context: { params: Promise<{ accountId: string }> }
) {
  const { accountId } = await context.params;
  try {
    return ok({ campaigns: await listAdAccountCampaigns(decodeURIComponent(accountId)) });
  } catch (error) {
    return failFromError(error);
  }
}
