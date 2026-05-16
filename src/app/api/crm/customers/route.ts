import { failFromError, ok } from "@/lib/api-response";
import { listCrmCustomers } from "@/lib/crm/customers";

export async function GET() {
  try {
    const result = await listCrmCustomers();
    return ok(result);
  } catch (error) {
    return failFromError(error);
  }
}
