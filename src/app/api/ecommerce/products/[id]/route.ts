import { fail, fromResult } from "@/lib/api-response";
import { getEcommerceProvider } from "@/lib/ecommerce/provider";
import { productIdParamSchema } from "@/lib/ecommerce/validation";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const parsed = productIdParamSchema.safeParse(await context.params);
  if (!parsed.success) return fail("Mã sản phẩm không hợp lệ");
  return fromResult(await getEcommerceProvider().getProductById(parsed.data.id));
}
