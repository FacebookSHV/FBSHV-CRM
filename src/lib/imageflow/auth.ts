import { getCloudflareContext } from "@opennextjs/cloudflare";

type RuntimeEnv = {
  IMAGEFLOW_BRIDGE_TOKEN?: string;
};

async function getRuntimeEnv(): Promise<RuntimeEnv> {
  try {
    const context = await getCloudflareContext({ async: true });
    return context.env as RuntimeEnv;
  } catch {
    return process.env as RuntimeEnv;
  }
}

function normalizeBearer(value: string | null) {
  const prefix = "Bearer ";
  if (!value?.startsWith(prefix)) return "";
  return value.slice(prefix.length).trim();
}

export async function requireImageflowBridgeAuth(request: Request) {
  const env = await getRuntimeEnv();
  const configuredToken = env.IMAGEFLOW_BRIDGE_TOKEN?.trim();
  if (!configuredToken) {
    throw new Error("BLOCKED_BY_MISSING_SECRET: IMAGEFLOW_BRIDGE_TOKEN");
  }

  const incoming = normalizeBearer(request.headers.get("authorization"));
  if (!incoming || incoming !== configuredToken) {
    throw new Error("IMAGEFLOW_BRIDGE_UNAUTHORIZED: Cầu nối ImageFlow chưa được xác thực.");
  }
}
