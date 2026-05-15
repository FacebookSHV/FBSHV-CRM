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
