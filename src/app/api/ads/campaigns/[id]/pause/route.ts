import { failFromError, ok } from "@/lib/api-response";
import { changeCampaignState } from "@/lib/facebook/ads";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  try {
    return ok(await changeCampaignState(id, "paused"));
  } catch (error) {
    return failFromError(error);
  }
}
