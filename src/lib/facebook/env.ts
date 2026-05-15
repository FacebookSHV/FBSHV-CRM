import type { FacebookRuntimeConfig } from "./types";

function isMissing(value?: string) {
  return (
    !value ||
    value === "replace_me" ||
    value === "do_not_commit_real_token" ||
    value.includes("replace_") ||
    value.includes("BLOCKED_SECRET_MISSING")
  );
}

export function getFacebookRuntimeConfig(
  env: Record<string, string | undefined> = process.env
): FacebookRuntimeConfig {
  const mode = env.MOCK_EXTERNAL_APIS === "false" ? "real" : "mock";
  const crmAppUrl = env.CRM_APP_URL || env.APP_BASE_URL || env.APP_URL || "http://localhost:3000";
  const graphApiVersion = env.META_GRAPH_API_VERSION || "v20.0";
  const redirectUri = env.META_REDIRECT_URI || `${crmAppUrl.replace(/\/$/, "")}/api/facebook/callback`;
  const verifyToken = env.META_VERIFY_TOKEN || "mock_verify_token";
  const requiredWhenReal = ["META_APP_ID", "META_APP_SECRET", "META_VERIFY_TOKEN", "ENCRYPTION_KEY"];
  const missing = mode === "real" ? requiredWhenReal.filter((key) => isMissing(env[key])) : [];

  if (mode === "real" && isMissing(env.CRM_APP_URL) && isMissing(env.APP_BASE_URL)) {
    missing.push("CRM_APP_URL");
  }

  return {
    mode,
    graphApiVersion,
    appId: env.META_APP_ID,
    appSecret: env.META_APP_SECRET,
    verifyToken,
    crmAppUrl,
    redirectUri,
    encryptionKey: env.ENCRYPTION_KEY,
    missing
  };
}

export function assertFacebookReady(config = getFacebookRuntimeConfig()) {
  if (config.mode === "real" && config.missing.length > 0) {
    return {
      ok: false as const,
      error: `BLOCKED_BY_MISSING_SECRET: ${config.missing.join(", ")}`
    };
  }

  return { ok: true as const };
}

export function isFacebookMockMode(config = getFacebookRuntimeConfig()) {
  return config.mode === "mock";
}
