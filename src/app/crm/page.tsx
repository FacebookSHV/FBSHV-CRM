import { CrmContent } from "@/components/crm/crm-content";
import { listCrmCustomers } from "@/lib/crm/customers";

export const dynamic = "force-dynamic";

export default async function CrmPage() {
  const result = await listCrmCustomers();
  return <CrmContent customers={result.customers} emptyMessage={result.emptyMessage} />;
}
