import { fromResult } from "@/lib/api-response";
import { getEcommerceProvider } from "@/lib/ecommerce/provider";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const result = await getEcommerceProvider().getProducts({
    q: url.searchParams.get("q") ?? undefined,
    sku: url.searchParams.get("sku") ?? undefined,
    limit: Number(url.searchParams.get("limit") ?? 50)
  });
  return fromResult(result);
}
