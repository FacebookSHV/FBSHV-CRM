import { getCloudflareContext } from "@opennextjs/cloudflare";
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

const DEFAULT_CRM_APP_URL = "https://fbshv-crm.ngchihuy.workers.dev";
const RUNTIME_STRING_KEYS = [
  "AD_WRITE_ACTIONS_ENABLED",
  "APP_BASE_URL",
  "CRM_APP_URL",
  "ENCRYPTION_KEY",
  "META_APP_ID",
  "META_APP_SECRET",
  "META_GRAPH_API_VERSION",
  "META_REDIRECT_URI",
  "META_VERIFY_TOKEN",
  "MOCK_EXTERNAL_APIS"
];

function pickStringBindings(bindings: Record<string, unknown>) {
  const values: Record<string, string> = {};
  for (const key of RUNTIME_STRING_KEYS) {
    if (typeof bindings[key] === "string") values[key] = normalizeRuntimeValue(key, bindings[key] as string);
  }
  return values;
}

function normalizeRuntimeValue(key: string, value: string) {
  const trimmed = value.trim();
  if (key === "META_APP_SECRET") return trimmed.match(/[a-f0-9]{32}/i)?.[0] ?? trimmed;
  return trimmed;
}

function trimRuntimeEnv(env: Record<string, string | undefined>) {
  return Object.fromEntries(
    Object.entries(env).map(([key, value]) => [key, typeof value === "string" ? normalizeRuntimeValue(key, value) : value])
  );
}

function getCloudflareStringBindings() {
  try {
    const context = getCloudflareContext();
    const bindings = context.env as Record<string, unknown>;
    return pickStringBindings(bindings);
  } catch {
    // NEO: Khi chạy test/local không có Cloudflare context thì dùng process.env như cũ.
    return {};
  }
}

function mergeRuntimeEnv(env: Record<string, string | undefined>) {
  return trimRuntimeEnv({ ...env, ...getCloudflareStringBindings() });
}

async function getCloudflareStringBindingsAsync() {
  try {
    const context = await getCloudflareContext({ async: true });
    const bindings = context.env as Record<string, unknown>;
    return pickStringBindings(bindings);
  } catch {
    return {};
  }
}

async function mergeRuntimeEnvAsync(env: Record<string, string | undefined>) {
  return trimRuntimeEnv({ ...env, ...(await getCloudflareStringBindingsAsync()) });
}

function buildFacebookRuntimeConfig(runtimeEnv: Record<string, string | undefined>): FacebookRuntimeConfig {
  const mode = runtimeEnv.MOCK_EXTERNAL_APIS === "false" ? "real" : "mock";
  const crmAppUrl = runtimeEnv.CRM_APP_URL || runtimeEnv.APP_BASE_URL || runtimeEnv.APP_URL || DEFAULT_CRM_APP_URL;
  const graphApiVersion = runtimeEnv.META_GRAPH_API_VERSION || "v20.0";
  const redirectUri = runtimeEnv.META_REDIRECT_URI || `${crmAppUrl.replace(/\/$/, "")}/api/facebook/callback`;
  const verifyToken = runtimeEnv.META_VERIFY_TOKEN || "mock_verify_token";
  const requiredWhenReal = ["META_APP_ID", "META_APP_SECRET", "META_VERIFY_TOKEN", "ENCRYPTION_KEY"];
  const missing = mode === "real" ? requiredWhenReal.filter((key) => isMissing(runtimeEnv[key])) : [];

  if (mode === "real" && isMissing(runtimeEnv.CRM_APP_URL) && isMissing(runtimeEnv.APP_BASE_URL)) {
    missing.push("CRM_APP_URL");
  }

  return {
    mode,
    graphApiVersion,
    appId: runtimeEnv.META_APP_ID,
    appSecret: runtimeEnv.META_APP_SECRET,
    verifyToken,
    crmAppUrl,
    redirectUri,
    encryptionKey: runtimeEnv.ENCRYPTION_KEY,
    missing
  };
}

export function getFacebookRuntimeConfig(
  env: Record<string, string | undefined> = process.env
): FacebookRuntimeConfig {
  const runtimeEnv = env === process.env ? mergeRuntimeEnv(env) : env;
  return buildFacebookRuntimeConfig(runtimeEnv);
}

export async function getFacebookRuntimeConfigAsync(
  env: Record<string, string | undefined> = process.env
): Promise<FacebookRuntimeConfig> {
  const runtimeEnv = env === process.env ? await mergeRuntimeEnvAsync(env) : env;
  return buildFacebookRuntimeConfig(runtimeEnv);
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
