import { failFromError, ok } from "@/lib/api-response";
import { listAdInsights } from "@/lib/facebook/ads";

export async function GET() {
  try {
    return ok({ insights: await listAdInsights() });
  } catch (error) {
    return failFromError(error);
  }
}
