import { AiAssistantContent } from "@/components/ai/ai-assistant-content";
import { readCachedProducts } from "@/lib/ecommerce/cache";

export const dynamic = "force-dynamic";

export default async function AiAssistantPage() {
  const products = await readCachedProducts({ limit: 20 });
  return <AiAssistantContent products={products} />;
}
