import { failFromError, ok } from "@/lib/api-response";
import { getAdsReadiness, syncAdAccountsFromMeta } from "@/lib/facebook/ads";

export async function GET() {
  try {
    return ok(await getAdsReadiness({ strict: true }));
  } catch (error) {
    return failFromError(error);
  }
}

export async function POST() {
  try {
    return ok(await syncAdAccountsFromMeta());
  } catch (error) {
    return failFromError(error);
  }
}
