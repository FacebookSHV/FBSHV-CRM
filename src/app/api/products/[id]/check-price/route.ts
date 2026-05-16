import { fail, fromResult } from "@/lib/api-response";
import { readCachedProductById } from "@/lib/ecommerce/cache";
import { getEcommerceProvider } from "@/lib/ecommerce/provider";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const product = await readCachedProductById(id);
  if (!product) return fail("Không tìm thấy sản phẩm đã sync trong D1.", 404, "PRODUCT_NOT_FOUND");

  // NEO: Kiểm giá luôn gọi Web Quản Lý TMĐT realtime, không tự bịa giá từ cache.
  return fromResult(await getEcommerceProvider().getSkuPrice(product.sku));
}
