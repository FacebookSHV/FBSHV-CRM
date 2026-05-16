import { failFromError, ok } from "@/lib/api-response";
import { getAdsReadiness } from "@/lib/facebook/ads";

export async function GET() {
  try {
    return ok(await getAdsReadiness({ strict: true }));
  } catch (error) {
    return failFromError(error);
  }
}
