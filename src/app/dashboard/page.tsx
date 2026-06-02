import { OverviewContent } from "@/components/dashboard/overview-content";
import { listCrmCustomers } from "@/lib/crm/customers";
import { readCachedProducts } from "@/lib/ecommerce/cache";
import { getFacebookStore } from "@/lib/facebook/store";
import { listContentPosts } from "@/lib/content-planner";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [products, pages, customers, posts] = await Promise.all([
    readCachedProducts({ limit: 5 }),
    (await getFacebookStore()).listPages(),
    listCrmCustomers(),
    listContentPosts()
  ]);
  const lowStock = products.filter((product) => product.availableStock <= product.lowStockThreshold).length;
  return (
    <OverviewContent
      products={products}
      metrics={[
        { label: "Fanpage", value: String(pages.length), helper: "Đã kết nối để chăm sóc và đăng bài" },
        { label: "Khách hàng", value: String(customers.customers.length), helper: "Tổng hợp từ inbox, comment và đơn hàng" },
        { label: "Sản phẩm", value: String(products.length), helper: "Đã đồng bộ từ Web Quản Lý TMĐT" },
        { label: "Bài đăng", value: String(posts.length), helper: `${lowStock} SKU cần chú ý tồn kho` }
      ]}
    />
  );
}
