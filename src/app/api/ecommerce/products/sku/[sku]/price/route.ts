import { fail, fromResult } from "@/lib/api-response";
import { getEcommerceProvider } from "@/lib/ecommerce/provider";
import { skuParamSchema } from "@/lib/ecommerce/validation";

export async function GET(
  _request: Request,
  context: { params: Promise<{ sku: string }> }
) {
  const parsed = skuParamSchema.safeParse(await context.params);
  if (!parsed.success) return fail("SKU không hợp lệ");
  return fromResult(await getEcommerceProvider().getSkuPrice(parsed.data.sku));
}
