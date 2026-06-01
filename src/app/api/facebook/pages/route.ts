import { failFromError, ok } from "@/lib/api-response";
import { getFacebookRuntimeConfigAsync } from "@/lib/facebook/env";
import { getFacebookStore } from "@/lib/facebook/store";

export async function GET() {
  try {
    const store = await getFacebookStore();
    const config = await getFacebookRuntimeConfigAsync();
    const pages = (await store.listPages()).map((page) => ({
      id: page.id,
      externalPageId: page.externalPageId,
      name: page.name,
      status: page.status,
      tokenStatus: page.tokenStatus,
      subscribedWebhook: page.subscribedWebhook,
      pictureUrl: page.pictureUrl,
      syncedAt: page.syncedAt
    }));

    // NEO: API Fanpage public chỉ trả trạng thái vận hành, không trả token đã mã hóa ra trình duyệt.
    return ok({
      mode: config.mode,
      missing: config.missing,
      pages
    });
  } catch (error) {
    return failFromError(error);
  }
}
