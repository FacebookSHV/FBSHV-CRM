import { fromResult } from "@/lib/api-response";
import { syncProductsFromExternal } from "@/lib/ecommerce/cache";

export async function POST() {
  // NEO: Đồng bộ sản phẩm từ Web Quản Lý TMĐT rồi upsert vào D1 product_cache.
  return fromResult(await syncProductsFromExternal());
}
