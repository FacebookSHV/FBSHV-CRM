import { notFound } from "next/navigation";
import { ProductDetail } from "@/components/products/product-detail";
import { readCachedProductById } from "@/lib/ecommerce/cache";

export default async function ProductDetailPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const product = await readCachedProductById(id);
  if (!product) notFound();
  return <ProductDetail product={product} />;
}
