import { failFromError, ok } from "@/lib/api-response";
import { getAdAccountDetail } from "@/lib/facebook/ads";

export async function GET(
  _request: Request,
  context: { params: Promise<{ accountId: string }> }
) {
  const { accountId } = await context.params;
  try {
    return ok({ account: await getAdAccountDetail(decodeURIComponent(accountId)) });
  } catch (error) {
    return failFromError(error);
  }
}
