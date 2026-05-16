import { failFromError, ok } from "@/lib/api-response";
import { listAdCampaigns } from "@/lib/facebook/ads";

export async function GET() {
  try {
    return ok({ campaigns: await listAdCampaigns() });
  } catch (error) {
    return failFromError(error);
  }
}
