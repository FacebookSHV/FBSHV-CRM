import { fromResult } from "@/lib/api-response";
import { readCachedProducts } from "@/lib/ecommerce/cache";

export async function GET(request: Request) {
  const url = new URL(request.url);
  // NEO: API Products đọc cache D1 bền sau F5; sync mới được phép gọi nguồn TMĐT thật.
  const products = await readCachedProducts({
    q: url.searchParams.get("q") ?? undefined,
    sku: url.searchParams.get("sku") ?? undefined,
    limit: Number(url.searchParams.get("limit") ?? 50)
  });
  return fromResult({ success: true, data: products });
}
