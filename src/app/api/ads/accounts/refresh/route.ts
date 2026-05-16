import { failFromError, ok } from "@/lib/api-response";
import { syncAdAccountsFromMeta } from "@/lib/facebook/ads";

export async function POST() {
  try {
    return ok(await syncAdAccountsFromMeta());
  } catch (error) {
    return failFromError(error);
  }
}
