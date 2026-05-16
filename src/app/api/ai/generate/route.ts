import { fail, failFromError, ok } from "@/lib/api-response";
import { generateAiText, type AiTask } from "@/lib/ai/provider";
import { getEcommerceProvider } from "@/lib/ecommerce/provider";

const tasks = new Set<AiTask>(["caption", "inbox", "script", "calendar", "audit", "hashtags"]);

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    task?: AiTask;
    productSku?: string;
    prompt?: string;
  };
  if (!body.task || !tasks.has(body.task)) return fail("Thiếu loại nội dung AI hợp lệ.", 400, "AI_TASK_REQUIRED");

  try {
    const provider = getEcommerceProvider();
    const productResult = body.productSku
      ? await provider.getProductBySku(body.productSku)
      : await provider.getProducts({ limit: 1 });
    const product = productResult.success
      ? Array.isArray(productResult.data)
        ? productResult.data[0] ?? null
        : productResult.data
      : null;

    return ok(await generateAiText({ task: body.task, product, prompt: body.prompt }));
  } catch (error) {
    return failFromError(error);
  }
}
