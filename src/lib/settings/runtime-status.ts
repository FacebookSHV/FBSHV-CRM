import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getAiConfig } from "@/lib/ai/provider";
import { getEcommerceProvider } from "@/lib/ecommerce/provider";
import { getFacebookRuntimeConfig } from "@/lib/facebook/env";
import { getAdsReadiness } from "@/lib/facebook/ads";
import { listAiProviderPublicStatus } from "./ai-keys";

function present(value?: string) {
  return Boolean(value && !value.includes("replace_") && value !== "replace_me" && !value.includes("BLOCKED_SECRET_MISSING"));
}

async function getBindings() {
  try {
    const context = await getCloudflareContext({ async: true });
    const env = context.env as { DB?: D1Database; BUCKET?: R2Bucket };
    return { db: Boolean(env.DB), r2: Boolean(env.BUCKET) };
  } catch {
    return { db: false, r2: false };
  }
}

export async function getRuntimeSettingsStatus() {
  const facebook = getFacebookRuntimeConfig();
  const ai = await listAiProviderPublicStatus();
  const ads = await getAdsReadiness();
  const bindings = await getBindings();
  const ecommerce = getEcommerceProvider();
  const aiConfig = getAiConfig();

  return {
    facebook: {
      mode: facebook.mode,
      configured: facebook.missing.length === 0,
      missing: facebook.missing,
      redirectUri: facebook.redirectUri,
      appId: present(facebook.appId) ? facebook.appId : null
    },
    ecommerce: {
      mode: process.env.MOCK_ECOMMERCE_API === "false" ? "real" : "not_enabled",
      configured: ecommerce.constructor.name !== "BlockedEcommerceManagementProvider",
      baseUrl: present(process.env.ECOMMERCE_API_BASE_URL) ? process.env.ECOMMERCE_API_BASE_URL : null
    },
    ai: {
      provider: aiConfig.provider,
      configured: ai.keys.length > 0,
      slots: ai.slots,
      keys: ai.keys
    },
    cloudflare: {
      worker: "fbshv-crm",
      expectedAccountId: "3d1e8c3bd1f4f9ace7388e60dd11fbed",
      d1: bindings.db,
      r2: bindings.r2,
      d1DatabaseName: "fbshv_crm_db",
      r2BucketName: "fbshv-crm-assets"
    },
    ads: {
      status: ads.status,
      missingPermissions: ads.missingPermissions,
      writeActionsEnabled: ads.writeActionsEnabled,
      accountCount: ads.accounts.length
    },
    webhook: {
      verifyTokenConfigured: present(process.env.META_VERIFY_TOKEN),
      facebookCallback: `${facebook.crmAppUrl.replace(/\/$/, "")}/api/facebook/callback`,
      facebookWebhook: `${facebook.crmAppUrl.replace(/\/$/, "")}/api/webhooks/facebook`
    }
  };
}
