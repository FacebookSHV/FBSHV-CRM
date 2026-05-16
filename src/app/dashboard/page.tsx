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
        { label: "Fanpage thật", value: String(pages.length), helper: "Đọc từ bảng pages" },
        { label: "Khách CRM", value: String(customers.customers.length), helper: "Tạo từ inbox/comment/order" },
        { label: "Sản phẩm TMĐT", value: String(products.length), helper: "Đọc từ D1 product_cache đã sync" },
        { label: "Nội dung", value: String(posts.length), helper: `${lowStock} SKU cần chú ý tồn` }
      ]}
    />
  );
}
