import { fail, fromResult } from "@/lib/api-response";
import { getEcommerceProviderAsync } from "@/lib/ecommerce/provider";
import { inventoryCheckSchema } from "@/lib/ecommerce/validation";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = inventoryCheckSchema.safeParse(body);
  if (!parsed.success) return fail("Dữ liệu giữ hàng không hợp lệ");

  const result = await (await getEcommerceProviderAsync()).reserveInventory(
    parsed.data.sku,
    parsed.data.quantity,
    { source: "facebook-crm" }
  );
  return fromResult(result);
}
