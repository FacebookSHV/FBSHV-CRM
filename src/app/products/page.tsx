import { ProductsContent } from "@/components/products/products-content";
import { getProductSyncSummary, readCachedProducts } from "@/lib/ecommerce/cache";

export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  const [products, syncSummary] = await Promise.all([readCachedProducts({ limit: 100 }), getProductSyncSummary()]);
  return <ProductsContent initialProducts={products} initialSyncSummary={syncSummary} />;
}
