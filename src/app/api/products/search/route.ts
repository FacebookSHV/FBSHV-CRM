import { fromResult } from "@/lib/api-response";
import { readCachedProducts } from "@/lib/ecommerce/cache";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const products = await readCachedProducts({
    q: url.searchParams.get("q") ?? undefined,
    limit: Number(url.searchParams.get("limit") ?? 20)
  });
  return fromResult({ success: true, data: products });
}
