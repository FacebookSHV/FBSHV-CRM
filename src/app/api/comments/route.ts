import { failFromError, ok } from "@/lib/api-response";
import { getFacebookRuntimeConfig } from "@/lib/facebook/env";
import { getFacebookStore } from "@/lib/facebook/store";

export async function GET() {
  try {
    const store = await getFacebookStore();
    const config = getFacebookRuntimeConfig();
    return ok({
      mode: config.mode,
      comments: await store.listComments()
    });
  } catch (error) {
    return failFromError(error);
  }
}
