import { OrderBuilder } from "@/components/orders/order-builder";
import { getEcommerceProvider } from "@/lib/ecommerce/provider";

export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  const result = await getEcommerceProvider().getProducts();
  return <OrderBuilder products={result.success ? result.data : []} />;
}
