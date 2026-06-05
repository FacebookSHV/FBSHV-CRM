import { fail, fromResult } from "@/lib/api-response";
import { getEcommerceProviderAsync } from "@/lib/ecommerce/provider";
import { skuParamSchema } from "@/lib/ecommerce/validation";

export async function GET(
  _request: Request,
  context: { params: Promise<{ sku: string }> }
) {
  const parsed = skuParamSchema.safeParse(await context.params);
  if (!parsed.success) return fail("SKU không hợp lệ");
  return fromResult(await (await getEcommerceProviderAsync()).getSkuPrice(parsed.data.sku));
}
