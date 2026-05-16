import { fromResult } from "@/lib/api-response";
import { syncProductsFromExternal } from "@/lib/ecommerce/cache";

export async function POST() {
  // NEO: Đồng bộ sản phẩm từ Web Quản Lý TMĐT qua /api/external/products rồi cache vào D1 CRM.
  return fromResult(await syncProductsFromExternal());
}
