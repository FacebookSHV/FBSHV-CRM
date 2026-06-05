import { fail, fromResult } from "@/lib/api-response";
import { readCachedProductById } from "@/lib/ecommerce/cache";
import { getEcommerceProviderAsync } from "@/lib/ecommerce/provider";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const product = await readCachedProductById(id);
  if (!product) return fail("Không tìm thấy sản phẩm đã sync trong D1.", 404, "PRODUCT_NOT_FOUND");

  const body = (await request.json().catch(() => ({}))) as { quantity?: number };
  const quantity = Number.isFinite(Number(body.quantity)) ? Math.max(1, Number(body.quantity)) : 1;
  // NEO: Kiểm tra tồn kho realtime trước khi tạo đơn, CRM không tự trừ tồn local.
  return fromResult(await (await getEcommerceProviderAsync()).checkInventory(product.sku, quantity));
}
