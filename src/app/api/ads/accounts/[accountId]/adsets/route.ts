import { failFromError, ok } from "@/lib/api-response";
import { listAdAccountAdSets } from "@/lib/facebook/ads";

export async function GET(
  request: Request,
  context: { params: Promise<{ accountId: string }> }
) {
  const { accountId } = await context.params;
  const url = new URL(request.url);
  try {
    return ok({ adsets: await listAdAccountAdSets(decodeURIComponent(accountId), url.searchParams.get("campaign_id")) });
  } catch (error) {
    return failFromError(error);
  }
}
