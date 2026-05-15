import { AiAssistantContent } from "@/components/ai/ai-assistant-content";
import { getEcommerceProvider } from "@/lib/ecommerce/provider";

export default async function AiAssistantPage() {
  const result = await getEcommerceProvider().getProducts();
  return <AiAssistantContent products={result.success ? result.data : []} />;
}
