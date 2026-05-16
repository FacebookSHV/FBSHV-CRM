import { fail, fromResult } from "@/lib/api-response";
import { readCachedProductById } from "@/lib/ecommerce/cache";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  if (!id?.trim()) return fail("Thiếu mã sản phẩm.", 400, "PRODUCT_ID_REQUIRED");
  const product = await readCachedProductById(id);
  return fromResult(product ? { success: true, data: product } : { success: false, error: "Không tìm thấy sản phẩm đã sync trong D1." });
}
