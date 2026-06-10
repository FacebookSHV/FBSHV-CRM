import { getCloudflareContext } from "@opennextjs/cloudflare";

export type RuntimeGuardEnv = Record<string, string | undefined>;

export type RuntimeGuardBindings = {
  db?: boolean;
  r2?: boolean;
};

export type RuntimeGuardCheck = {
  key: string;
  ok: boolean;
  code?: "BLOCKED_BY_MISSING_SECRET" | "BLOCKED_BY_MISSING_BINDING" | "BLOCKED_BY_MOCK_IN_PRODUCTION";
  message?: string;
};

export type RuntimeGuardReport = {
  ready: boolean;
  mode: "production" | "development" | "test";
  checks: RuntimeGuardCheck[];
  missingSecrets: string[];
  missingBindings: string[];
  mockFlags: string[];
};

const REQUIRED_SECRETS = [
  "META_APP_ID",
  "META_APP_SECRET",
  "META_VERIFY_TOKEN",
  "CRM_APP_URL",
  "ENCRYPTION_KEY",
  "ECOMMERCE_API_BASE_URL",
  "ECOMMERCE_API_KEY",
  "ECOMMERCE_WEBHOOK_SECRET"
];

function runtimeMode(env: RuntimeGuardEnv) {
  const value = env.NODE_ENV === "production" ? "production" : env.NODE_ENV === "test" ? "test" : "development";
  return value;
}

function isMissing(value?: string) {
  return !value || value.includes("replace_") || value === "replace_me" || value.includes("BLOCKED_SECRET_MISSING");
}

export function buildRuntimeGuardReport(env: RuntimeGuardEnv, bindings: RuntimeGuardBindings = {}): RuntimeGuardReport {
  const mode = runtimeMode(env);
  const checks: RuntimeGuardCheck[] = [];

  for (const key of REQUIRED_SECRETS) {
    const ok = !isMissing(env[key]);
    checks.push({
      key,
      ok,
      code: ok ? undefined : "BLOCKED_BY_MISSING_SECRET",
      message: ok ? undefined : `${key} chưa được cấu hình.`
    });
  }

  const bindingChecks: Array<[string, boolean | undefined]> = [
    ["DB", bindings.db],
    ["BUCKET", bindings.r2]
  ];
  for (const [key, value] of bindingChecks) {
    const ok = Boolean(value);
    checks.push({
      key,
      ok,
      code: ok ? undefined : "BLOCKED_BY_MISSING_BINDING",
      message: ok ? undefined : `${key} binding chưa sẵn sàng.`
    });
  }

  const mockFlags: Array<[string, string | undefined]> = [
    ["MOCK_EXTERNAL_APIS", env.MOCK_EXTERNAL_APIS],
    ["MOCK_ECOMMERCE_API", env.MOCK_ECOMMERCE_API]
  ];
  for (const [key, value] of mockFlags) {
    const ok = mode !== "production" || value === "false";
    checks.push({
      key,
      ok,
      code: ok ? undefined : "BLOCKED_BY_MOCK_IN_PRODUCTION",
      message: ok ? undefined : `${key} phải bằng false trong production.`
    });
  }

  const missingSecrets = checks
    .filter((item) => item.code === "BLOCKED_BY_MISSING_SECRET")
    .map((item) => item.key);
  const missingBindings = checks
    .filter((item) => item.code === "BLOCKED_BY_MISSING_BINDING")
    .map((item) => item.key);
  const enabledMockFlags = checks
    .filter((item) => item.code === "BLOCKED_BY_MOCK_IN_PRODUCTION")
    .map((item) => item.key);

  return {
    ready: checks.every((item) => item.ok),
    mode,
    checks,
    missingSecrets,
    missingBindings,
    mockFlags: enabledMockFlags
  };
}

export async function readRuntimeGuardBindings() {
  try {
    const context = await getCloudflareContext({ async: true });
    const env = context.env as { DB?: D1Database; BUCKET?: R2Bucket };
    return { db: Boolean(env.DB), r2: Boolean(env.BUCKET) };
  } catch {
    return { db: false, r2: false };
  }
}

export async function assertProductionReady(env: RuntimeGuardEnv = process.env) {
  const report = buildRuntimeGuardReport(env, await readRuntimeGuardBindings());
  if (report.ready) return report;
  const first = report.checks.find((item) => !item.ok);
  throw new Error(`${first?.code ?? "BLOCKED_BY_MISSING_SECRET"}: ${first?.message ?? "Runtime chưa sẵn sàng."}`);
}
