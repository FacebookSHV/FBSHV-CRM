import { ProductsContent } from "@/components/products/products-content";
import { getEcommerceProvider } from "@/lib/ecommerce/provider";

export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  const result = await getEcommerceProvider().getProducts();
  return <ProductsContent initialProducts={result.success ? result.data : []} />;
}
