import { notFound } from "next/navigation";
import { ProductDetail } from "@/components/products/product-detail";
import { getEcommerceProvider } from "@/lib/ecommerce/provider";

export default async function ProductDetailPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await getEcommerceProvider().getProductById(id);
  if (!result.success) notFound();
  return <ProductDetail product={result.data} />;
}
