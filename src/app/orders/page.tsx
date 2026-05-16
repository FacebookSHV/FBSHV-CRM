import { OrderBuilder } from "@/components/orders/order-builder";
import { readCachedProducts } from "@/lib/ecommerce/cache";

export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  const products = await readCachedProducts({ limit: 100 });
  return <OrderBuilder products={products} />;
}
