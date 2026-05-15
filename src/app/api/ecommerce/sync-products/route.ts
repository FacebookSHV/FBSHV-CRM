import { fromResult } from "@/lib/api-response";
import { getEcommerceProvider } from "@/lib/ecommerce/provider";

export async function POST() {
  // NEO: Đồng bộ sản phẩm từ Web Quản Lý TMĐT
  return fromResult(await getEcommerceProvider().syncProducts());
}
