import { fail, fromResult } from "@/lib/api-response";
import { readCachedProductById } from "@/lib/ecommerce/cache";
import { productIdParamSchema } from "@/lib/ecommerce/validation";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const parsed = productIdParamSchema.safeParse(await context.params);
  if (!parsed.success) return fail("Mã sản phẩm không hợp lệ");
  const product = await readCachedProductById(parsed.data.id);
  return fromResult(product ? { success: true, data: product } : { success: false, error: "Không tìm thấy sản phẩm đã sync trong D1." });
}
