import { fail, fromResult } from "@/lib/api-response";
import { getEcommerceProvider } from "@/lib/ecommerce/provider";
import { inventoryCheckSchema } from "@/lib/ecommerce/validation";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = inventoryCheckSchema.safeParse(body);
  if (!parsed.success) return fail("Dữ liệu kiểm tồn không hợp lệ");

  // NEO: Kiểm tra tồn kho realtime trước khi tạo đơn
  const result = await getEcommerceProvider().checkInventory(
    parsed.data.sku,
    parsed.data.quantity
  );
  return fromResult(result);
}
