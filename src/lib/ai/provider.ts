import type { ProductWithInventory } from "@/lib/ecommerce/types";
import { formatMoney } from "@/lib/money";
import { listAiRuntimeKeys, type AiRuntimeKey } from "@/lib/settings/ai-keys";

export type AiTask = "caption" | "inbox" | "script" | "calendar" | "audit" | "hashtags";

export type AiErrorStatus =
  | "valid"
  | "invalid_key"
  | "quota_exceeded"
  | "api_disabled"
  | "permission_denied"
  | "model_not_found"
  | "rate_limited"
  | "network_error"
  | "unknown_error";

export type AiGenerationResult = {
  mode: "ai" | "template";
  provider: "gemini" | "openai" | "template";
  text: string;
  notice?: string;
  failures?: Array<{ keyName: string; provider: "gemini" | "openai"; status: AiErrorStatus; message: string }>;
  needUser?: "NEED_USER_AI_SECRET";
};

export type AiKeyTestResult = {
  valid: boolean;
  provider: "gemini" | "openai";
  keyName: string;
  masked?: string;
  status: AiErrorStatus;
  message: string;
  model: string;
};

type AiConfig = {
  provider: "gemini" | "openai" | "template";
  apiKey?: string;
  keyName?: string;
  model?: string;
  missing: string[];
};

class AiProviderError extends Error {
  constructor(
    readonly aiStatus: AiErrorStatus,
    message: string
  ) {
    super(message);
  }
}

type ProviderErrorPayload = {
  error?: {
    message?: string;
    status?: string;
    code?: string | number;
    type?: string;
  };
};

function firstPresent(env: Record<string, string | undefined>, keys: string[]) {
  for (const key of keys) {
    const value = env[key];
    if (value && !value.includes("replace_") && !value.includes("BLOCKED_SECRET_MISSING")) return { key, value };
  }
  return null;
}

export function getAiConfig(env: Record<string, string | undefined> = process.env): AiConfig {
  const gemini = firstPresent(env, [
    "GEMINI_API_KEY_1",
    "GEMINI_API_KEY_2",
    "GEMINI_API_KEY_3",
    "GEMINI_API_KEY_4",
    "GEMINI_API_KEY_5",
    "GEMINI_API_KEY"
  ]);
  if (gemini) {
    return {
      provider: "gemini",
      apiKey: gemini.value,
      keyName: gemini.key,
      model: env.GEMINI_MODEL || "gemini-2.5-flash",
      missing: []
    };
  }

  const openai = firstPresent(env, ["OPENAI_API_KEY"]);
  if (openai) {
    return {
      provider: "openai",
      apiKey: openai.value,
      keyName: openai.key,
      model: env.OPENAI_MODEL || "gpt-4o-mini",
      missing: []
    };
  }

  return {
    provider: "template",
    missing: ["GEMINI_API_KEY", "OPENAI_API_KEY"]
  };
}

function configFromRuntimeKey(key: AiRuntimeKey, env: Record<string, string | undefined>): AiConfig {
  return {
    provider: key.provider,
    apiKey: key.value,
    keyName: key.keyName,
    model: key.provider === "gemini" ? env.GEMINI_MODEL || "gemini-2.5-flash" : env.OPENAI_MODEL || "gpt-4o-mini",
    missing: []
  };
}

function productLine(product?: ProductWithInventory | null) {
  if (!product) return "Chưa chọn sản phẩm cụ thể.";
  const imageLines = (product.images ?? []).slice(0, 8).map((url, index) => `Ảnh ${index + 1}: ${url}`);
  return [
    `Sản phẩm: ${product.name}`,
    `SKU: ${product.sku}`,
    `Giá: ${formatMoney(product.currentPrice, product.currency)}`,
    `Tồn khả dụng: ${product.availableStock}`,
    product.description ? `Mô tả Product Core: ${product.description}` : "",
    product.promptAssets?.promptText ? `Ngữ cảnh prompt Product Core: ${product.promptAssets.promptText}` : "",
    imageLines.length > 0 ? `Danh sách ảnh thật:\n${imageLines.join("\n")}` : ""
  ].filter(Boolean).join("\n");
}

function fallbackText(task: AiTask, product?: ProductWithInventory | null, prompt = "") {
  const name = product?.name || "sản phẩm Shop Huy Vân";
  const price = product ? formatMoney(product.currentPrice, product.currency) : "";
  if (task === "inbox") {
    return `Dạ shop hỗ trợ mình ${name}. Mình cho shop biết nhu cầu sử dụng, số lượng cần mua và khu vực nhận hàng để shop kiểm tra tồn kho, giá hiện tại ${price || "mới nhất"} và tư vấn mẫu phù hợp.`;
  }
  if (task === "script") {
    return `Kịch bản video ngắn:\n1. Mở đầu bằng vấn đề khách hay gặp.\n2. Cận cảnh ${name} và điểm tiện lợi chính.\n3. Hiển thị giá/tồn kho nếu còn chính xác.\n4. Kêu gọi nhắn tin để shop kiểm tra mẫu phù hợp.`;
  }
  if (task === "hashtags") {
    return "#ShopHuyVan #GiaDungThongMinh #DoDienGiaDung #TuVanNhanh #HangSanCo";
  }
  if (task === "calendar") {
    return `Lịch gợi ý: xen kẽ bài giới thiệu sản phẩm, hướng dẫn sử dụng, giải đáp thắc mắc và nhắc khách nhắn tin để kiểm tồn realtime. ${prompt}`;
  }
  if (task === "audit") {
    return `Khuyến nghị: ưu tiên trả lời inbox/comment mới, kiểm tra bình luận có số điện thoại, và dùng sản phẩm còn tồn để lên lịch nội dung. ${prompt}`;
  }
  return `${name} đang có trong danh mục Shop Huy Vân${price ? ` với giá tham khảo ${price}` : ""}. Nhắn tin cho shop để kiểm tra tồn kho realtime và được tư vấn đúng nhu cầu.`;
}

function buildPrompt(task: AiTask, product?: ProductWithInventory | null, prompt = "") {
  return [
    "Bạn là trợ lý nội dung bán hàng cho Shop Huy Vân.",
    "Viết tiếng Việt có dấu, tự nhiên, không dùng emoji, không bịa dữ liệu chưa có.",
    "Nếu thiếu tồn kho, giá hoặc event thì nói rõ cần kiểm tra lại thay vì khẳng định.",
    productLine(product),
    `Nhiệm vụ: ${task}`,
    prompt ? `Yêu cầu thêm: ${prompt}` : ""
  ]
    .filter(Boolean)
    .join("\n");
}

function classifyAiError(provider: "gemini" | "openai", responseStatus: number, payload: ProviderErrorPayload): { status: AiErrorStatus; message: string } {
  const error = payload.error ?? {};
  const code = String(error.code ?? "").toLowerCase();
  const status = String(error.status ?? "").toLowerCase();
  const type = String(error.type ?? "").toLowerCase();
  const message = error.message || `${provider} API trả lỗi HTTP ${responseStatus}.`;
  const haystack = `${code} ${status} ${type} ${message}`.toLowerCase();

  if (haystack.includes("api_key_invalid") || haystack.includes("invalid api key") || haystack.includes("invalid_key") || responseStatus === 401) {
    return { status: "invalid_key", message };
  }
  if (haystack.includes("quota") || haystack.includes("resource_exhausted") || haystack.includes("insufficient_quota")) {
    return { status: "quota_exceeded", message };
  }
  if (haystack.includes("api has not been used") || haystack.includes("api disabled") || haystack.includes("service disabled")) {
    return { status: "api_disabled", message };
  }
  if (haystack.includes("permission_denied") || haystack.includes("permission") || responseStatus === 403) {
    return { status: "permission_denied", message };
  }
  if (haystack.includes("model") && (haystack.includes("not found") || haystack.includes("not_found") || responseStatus === 404)) {
    return { status: "model_not_found", message };
  }
  if (haystack.includes("rate") || responseStatus === 429) {
    return { status: "rate_limited", message };
  }
  return { status: "unknown_error", message };
}

async function callGemini(config: AiConfig, prompt: string) {
  const url = new URL(`https://generativelanguage.googleapis.com/v1beta/models/${config.model}:generateContent`);
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", "x-goog-api-key": config.apiKey! },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.7, maxOutputTokens: 700 }
    })
  }).catch((error) => {
    throw new AiProviderError("network_error", error instanceof Error ? error.message : "Không kết nối được Gemini API.");
  });
  const payload = (await response.json().catch(() => ({}))) as ProviderErrorPayload & {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  if (!response.ok || payload.error) {
    const classified = classifyAiError("gemini", response.status, payload);
    throw new AiProviderError(classified.status, classified.message);
  }
  return payload.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("").trim() || "";
}

async function callOpenAi(config: AiConfig, prompt: string) {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${config.apiKey}`
    },
    body: JSON.stringify({
      model: config.model,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7
    })
  }).catch((error) => {
    throw new AiProviderError("network_error", error instanceof Error ? error.message : "Không kết nối được OpenAI API.");
  });
  const payload = (await response.json().catch(() => ({}))) as ProviderErrorPayload & {
    choices?: Array<{ message?: { content?: string } }>;
  };
  if (!response.ok || payload.error) {
    const classified = classifyAiError("openai", response.status, payload);
    throw new AiProviderError(classified.status, classified.message);
  }
  return payload.choices?.[0]?.message?.content?.trim() || "";
}

function errorStatus(error: unknown) {
  if (error instanceof AiProviderError) return { status: error.aiStatus, message: error.message };
  if (error instanceof Error) return { status: "unknown_error" as const, message: error.message };
  return { status: "unknown_error" as const, message: "AI provider trả lỗi không xác định." };
}

export async function testAiRuntimeKey(key: AiRuntimeKey, env: Record<string, string | undefined> = process.env): Promise<AiKeyTestResult> {
  const config = configFromRuntimeKey(key, env);
  const provider = key.provider;
  const prompt = "Viết một câu test ngắn bằng tiếng Việt có dấu, không dùng emoji.";
  try {
    const text = provider === "gemini" ? await callGemini(config, prompt) : await callOpenAi(config, prompt);
    return {
      valid: Boolean(text),
      provider,
      keyName: key.keyName,
      masked: key.masked,
      status: "valid",
      message: "AI key test thành công.",
      model: config.model || ""
    };
  } catch (error) {
    const classified = errorStatus(error);
    return {
      valid: false,
      provider,
      keyName: key.keyName,
      masked: key.masked,
      status: classified.status,
      message: classified.message,
      model: config.model || ""
    };
  }
}

export async function generateAiText(input: {
  task: AiTask;
  product?: ProductWithInventory | null;
  prompt?: string;
  env?: Record<string, string | undefined>;
}): Promise<AiGenerationResult> {
  const env = input.env ?? process.env;
  const runtimeKeys = await listAiRuntimeKeys(env);
  const template = fallbackText(input.task, input.product, input.prompt);
  if (runtimeKeys.length === 0) {
    return {
      mode: "template",
      provider: "template",
      text: template,
      notice: "AI chưa cấu hình - đang dùng template an toàn",
      needUser: "NEED_USER_AI_SECRET"
    };
  }

  const prompt = buildPrompt(input.task, input.product, input.prompt);
  const failures: AiGenerationResult["failures"] = [];
  for (const key of runtimeKeys) {
    const config = configFromRuntimeKey(key, env);
    try {
      const text = key.provider === "gemini" ? await callGemini(config, prompt) : await callOpenAi(config, prompt);
      return {
        mode: "ai",
        provider: key.provider,
        text: text || template,
        failures,
        notice: key.source === "settings" ? `AI thật: ${key.provider} (${key.keyName})` : `AI thật: ${key.provider} (${key.keyName})`
      };
    } catch (error) {
      const classified = errorStatus(error);
      failures.push({
        keyName: key.keyName,
        provider: key.provider,
        status: classified.status,
        message: classified.message
      });
      // NEO: Failover AI chạy sang key tiếp theo khi key hiện tại lỗi hoặc hết quota.
    }
  }

  return {
    mode: "template",
    provider: "template",
    text: template,
    failures,
    notice: `AI fallback: đã thử ${runtimeKeys.length} key, lỗi cuối ${failures.at(-1)?.keyName ?? "unknown"} = ${failures.at(-1)?.status ?? "unknown_error"}.`,
    needUser: "NEED_USER_AI_SECRET"
  };
}
