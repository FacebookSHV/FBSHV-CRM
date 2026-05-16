import { failFromError, ok } from "@/lib/api-response";
import { listAdAccountInsights } from "@/lib/facebook/ads";

export async function GET(
  request: Request,
  context: { params: Promise<{ accountId: string }> }
) {
  const { accountId } = await context.params;
  const url = new URL(request.url);
  try {
    return ok({
      insights: await listAdAccountInsights(decodeURIComponent(accountId), {
        datePreset: url.searchParams.get("date_preset"),
        since: url.searchParams.get("since"),
        until: url.searchParams.get("until"),
        level: url.searchParams.get("level")
      })
    });
  } catch (error) {
    return failFromError(error);
  }
}
