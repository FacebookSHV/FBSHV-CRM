import type { ProductWithInventory } from "@/lib/ecommerce/types";
import { formatMoney } from "@/lib/money";
import { listAiRuntimeKeys, type AiRuntimeKey } from "@/lib/settings/ai-keys";

export type AiTask = "caption" | "inbox" | "script" | "calendar" | "audit" | "hashtags";

export type AiGenerationResult = {
  mode: "ai" | "template";
  provider: "gemini" | "openai" | "template";
  text: string;
  notice?: string;
  needUser?: "NEED_USER_AI_SECRET";
};

type AiConfig = {
  provider: "gemini" | "openai" | "template";
  apiKey?: string;
  keyName?: string;
  model?: string;
  missing: string[];
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
      model: env.GEMINI_MODEL || "gemini-1.5-flash",
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
    model: key.provider === "gemini" ? env.GEMINI_MODEL || "gemini-1.5-flash" : env.OPENAI_MODEL || "gpt-4o-mini",
    missing: []
  };
}

function productLine(product?: ProductWithInventory | null) {
  if (!product) return "Chưa chọn sản phẩm cụ thể.";
  return [
    `Sản phẩm: ${product.name}`,
    `SKU: ${product.sku}`,
    `Giá: ${formatMoney(product.currentPrice, product.currency)}`,
    `Tồn khả dụng: ${product.availableStock}`
  ].join("\n");
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
    return `#ShopHuyVan #GiaDungThongMinh #DoDienGiaDung #TuVanNhanh #HangSanCo`;
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

async function callGemini(config: AiConfig, prompt: string) {
  const url = new URL(`https://generativelanguage.googleapis.com/v1beta/models/${config.model}:generateContent`);
  url.searchParams.set("key", config.apiKey!);
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.7, maxOutputTokens: 700 }
    })
  });
  const payload = (await response.json().catch(() => ({}))) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    error?: { message?: string };
  };
  if (!response.ok) throw new Error(payload.error?.message || "Gemini API lỗi.");
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
  });
  const payload = (await response.json().catch(() => ({}))) as {
    choices?: Array<{ message?: { content?: string } }>;
    error?: { message?: string };
  };
  if (!response.ok) throw new Error(payload.error?.message || "OpenAI API lỗi.");
  return payload.choices?.[0]?.message?.content?.trim() || "";
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
  for (const key of runtimeKeys) {
    const config = configFromRuntimeKey(key, env);
    try {
      const text = config.provider === "gemini" ? await callGemini(config, prompt) : await callOpenAi(config, prompt);
      return {
        mode: "ai",
        provider: config.provider,
        text: text || template,
        notice: key.source === "settings" ? `AI thật: ${config.provider} (${key.keyName})` : undefined
      };
    } catch {
      // NEO: Failover AI chạy sang key tiếp theo khi key hiện tại lỗi hoặc hết quota.
    }
  }

  return {
    mode: "template",
    provider: "template",
    text: template,
    notice: `AI key lỗi hoặc hết quota - đã thử ${runtimeKeys.length} key và dùng template an toàn.`,
    needUser: "NEED_USER_AI_SECRET"
  };
}
