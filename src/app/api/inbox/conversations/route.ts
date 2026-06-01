import { failFromError, ok } from "@/lib/api-response";
import { getFacebookRuntimeConfigAsync } from "@/lib/facebook/env";
import { getFacebookStore } from "@/lib/facebook/store";

export async function GET() {
  try {
    const store = await getFacebookStore();
    const config = await getFacebookRuntimeConfigAsync();
    return ok({
      mode: config.mode,
      conversations: await store.listConversations()
    });
  } catch (error) {
    return failFromError(error);
  }
}
