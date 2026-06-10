import { getCloudflareContext } from "@opennextjs/cloudflare";

export type ContentRuntimeEnv = Record<string, string | undefined>;

export async function getContentRuntimeEnv(base: ContentRuntimeEnv = process.env) {
  try {
    const context = await getCloudflareContext({ async: true });
    return {
      ...base,
      ...(context.env as ContentRuntimeEnv)
    };
  } catch {
    return base;
  }
}

export function autoPublishEnabled(env: ContentRuntimeEnv = process.env) {
  return env.AUTO_PUBLISH_POSTS_ENABLED === "true";
}

export async function isAutoPublishRuntimeEnabled() {
  return autoPublishEnabled(await getContentRuntimeEnv());
}

export async function getContentAutomationToken() {
  return (await getContentRuntimeEnv()).CONTENT_AUTOMATION_TOKEN?.trim() || "";
}
