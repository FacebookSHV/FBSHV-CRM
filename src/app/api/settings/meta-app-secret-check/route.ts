import { getCloudflareContext } from "@opennextjs/cloudflare";
import { failFromError, ok } from "@/lib/api-response";
import { verifyMetaAppSecret } from "@/lib/facebook/client";
import { getFacebookRuntimeConfigAsync } from "@/lib/facebook/env";

async function bindingSecret() {
  try {
    const context = await getCloudflareContext({ async: true });
    const value = (context.env as Record<string, unknown>).META_APP_SECRET;
    return typeof value === "string" ? value.match(/[a-f0-9]{32}/i)?.[0] ?? value.trim() : undefined;
  } catch {
    return undefined;
  }
}

export async function GET() {
  try {
    const config = await getFacebookRuntimeConfigAsync();
    const result = await verifyMetaAppSecret(config);
    const bindingMetaSecret = await bindingSecret();
    const bindingResult = bindingMetaSecret
      ? await verifyMetaAppSecret({ ...config, appSecret: bindingMetaSecret })
      : { valid: false as const, error: "binding_missing" };
    const processSecret = process.env.META_APP_SECRET?.match(/[a-f0-9]{32}/i)?.[0] ?? process.env.META_APP_SECRET?.trim();
    const processResult = processSecret
      ? await verifyMetaAppSecret({ ...config, appSecret: processSecret })
      : { valid: false as const, error: "process_missing" };
    // NEO: Endpoint chẩn đoán chỉ trả trạng thái, không trả App Secret hay access token.
    return ok({
      mode: config.mode,
      configured: config.missing.length === 0,
      valid: result.valid,
      error: result.valid ? null : result.error,
      code: result.valid ? null : result.code ?? null,
      type: result.valid ? null : result.type ?? null,
      binding: {
        present: Boolean(bindingMetaSecret),
        length: bindingMetaSecret?.length ?? 0,
        valid: bindingResult.valid,
        error: bindingResult.valid ? null : bindingResult.error
      },
      processEnv: {
        present: Boolean(processSecret),
        length: processSecret?.length ?? 0,
        valid: processResult.valid,
        error: processResult.valid ? null : processResult.error
      }
    });
  } catch (error) {
    return failFromError(error);
  }
}
