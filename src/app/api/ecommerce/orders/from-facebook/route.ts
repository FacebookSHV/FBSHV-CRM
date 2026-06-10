import { fail, fromResult } from "@/lib/api-response";
import { createFacebookOrderThroughCore } from "@/lib/core-flow/order-core-contract";
import { facebookOrderSchema } from "@/lib/ecommerce/validation";
import { getProductionWriteTestDecision } from "@/lib/external-test-safety";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = facebookOrderSchema.safeParse(body);
  if (!parsed.success) return fail("Dữ liệu tạo đơn không hợp lệ");
  const writeDecision = getProductionWriteTestDecision();
  if (!writeDecision.shouldRun || process.env.SKU_TEST !== parsed.data.sku) {
    return fail(
      `Chặn tạo đơn thật vì an toàn: ${writeDecision.reasons.join(", ") || "SKU không phải SKU_TEST riêng"}.`,
      403,
      "EXTERNAL_WRITE_TEST_BLOCKED"
    );
  }

  // NEO: Không tự trừ tồn local; Order Core phải xác nhận trước khi CRM ghi read-model.
  return fromResult(await createFacebookOrderThroughCore(parsed.data));
}
