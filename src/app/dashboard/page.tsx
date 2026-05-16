import { OverviewContent } from "@/components/dashboard/overview-content";
import { listCrmCustomers } from "@/lib/crm/customers";
import { getEcommerceProvider } from "@/lib/ecommerce/provider";
import { getFacebookStore } from "@/lib/facebook/store";
import { listContentPosts } from "@/lib/content-planner";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [productsResult, pages, customers, posts] = await Promise.all([
    getEcommerceProvider().getProducts({ limit: 5 }),
    (await getFacebookStore()).listPages(),
    listCrmCustomers(),
    listContentPosts()
  ]);
  const products = productsResult.success ? productsResult.data : [];
  const lowStock = products.filter((product) => product.availableStock <= product.lowStockThreshold).length;
  return (
    <OverviewContent
      products={products}
      metrics={[
        { label: "Fanpage thật", value: String(pages.length), helper: "Đọc từ bảng pages" },
        { label: "Khách CRM", value: String(customers.customers.length), helper: "Tạo từ inbox/comment/order" },
        { label: "Sản phẩm TMĐT", value: String(products.length), helper: "Kéo từ API external" },
        { label: "Nội dung", value: String(posts.length), helper: `${lowStock} SKU cần chú ý tồn` }
      ]}
    />
  );
}
