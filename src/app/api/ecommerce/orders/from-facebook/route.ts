import { fail, fromResult } from "@/lib/api-response";
import { getEcommerceProvider } from "@/lib/ecommerce/provider";
import { facebookOrderSchema } from "@/lib/ecommerce/validation";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = facebookOrderSchema.safeParse(body);
  if (!parsed.success) return fail("Dữ liệu tạo đơn không hợp lệ");

  const provider = getEcommerceProvider();
  const price = await provider.getSkuPrice(parsed.data.sku);
  if (!price.success) return fromResult(price);

  const inventory = await provider.checkInventory(parsed.data.sku, parsed.data.quantity);
  if (!inventory.success) return fromResult(inventory);
  if (!inventory.data.enoughStock) return fail("Tồn kho realtime không đủ để tạo đơn.", 409, "INSUFFICIENT_STOCK");

  const idempotencyKey = `fbcrm:${parsed.data.conversationId ?? parsed.data.customerId}:${parsed.data.sku}`;
  const reservation = await provider.reserveInventory(parsed.data.sku, parsed.data.quantity, {
    idempotencyKey,
    source: "facebook_crm",
    sourceConversationId: parsed.data.conversationId,
    sourceCustomerId: parsed.data.customerId
  });
  if (!reservation.success) return fromResult(reservation);

  // NEO: Không tự trừ tồn local; chỉ gọi Web Quản Lý TMĐT tạo đơn sau khi giữ hàng thành công.
  return fromResult(
    await provider.createOrderFromFacebook({
      ...parsed.data,
      currentPrice: price.data.price,
      currency: price.data.currency,
      reservationId: reservation.data.reservationId,
      sourceOrderId: idempotencyKey
    })
  );
}
