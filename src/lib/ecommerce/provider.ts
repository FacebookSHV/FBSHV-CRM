import { getCloudflareContext } from "@opennextjs/cloudflare";
import { BlockedEcommerceManagementProvider } from "./blocked-provider";
import { HttpEcommerceManagementProvider } from "./http-provider";
import { MockEcommerceManagementProvider } from "./mock-provider";
import type { EcommerceManagementProvider } from "./types";

const mockProvider = new MockEcommerceManagementProvider();

function isPlaceholder(value?: string) {
  return !value || value.includes("replace_") || value === "replace_me" || value.includes("BLOCKED_SECRET_MISSING");
}

export function getEcommerceProvider(env: Record<string, string | undefined> = process.env): EcommerceManagementProvider {
  const mockEnabled = env.MOCK_ECOMMERCE_API !== "false";
  const apiKey = env.ECOMMERCE_API_KEY;
  const baseUrl = env.ECOMMERCE_API_BASE_URL;

  if (mockEnabled) {
    return mockProvider;
  }

  const missing = [
    isPlaceholder(baseUrl) ? "ECOMMERCE_API_BASE_URL" : null,
    isPlaceholder(apiKey) ? "ECOMMERCE_API_KEY" : null
  ].filter((item): item is string => Boolean(item));

  if (missing.length > 0) return new BlockedEcommerceManagementProvider(missing);

  // NEO: Product Sync chỉ gọi Web Quản Lý TMĐT qua API đã cấu hình secret
  return new HttpEcommerceManagementProvider({
    baseUrl: baseUrl!,
    apiKey: apiKey!
  });
}

function pickRuntimeBindings(env: Record<string, unknown>) {
  const keys = ["ECOMMERCE_API_BASE_URL", "ECOMMERCE_API_KEY", "ECOMMERCE_WEBHOOK_SECRET", "MOCK_ECOMMERCE_API"];
  return Object.fromEntries(
    keys
      .map((key) => [key, typeof env[key] === "string" ? (env[key] as string) : undefined])
      .filter(([, value]) => Boolean(value))
  ) as Record<string, string | undefined>;
}

export async function getEcommerceProviderAsync(
  env: Record<string, string | undefined> = process.env
): Promise<EcommerceManagementProvider> {
  return getEcommerceProvider(await getEcommerceRuntimeEnv(env));
}

export async function getEcommerceRuntimeEnv(
  env: Record<string, string | undefined> = process.env
): Promise<Record<string, string | undefined>> {
  if (env !== process.env) return env;
  try {
    const context = await getCloudflareContext({ async: true });
    // NEO: Worker production đọc secret TMĐT từ Cloudflare bindings, không chỉ dựa vào process.env build-time.
    return {
      ...process.env,
      ...pickRuntimeBindings(context.env as Record<string, unknown>)
    };
  } catch {
    return env;
  }
}
