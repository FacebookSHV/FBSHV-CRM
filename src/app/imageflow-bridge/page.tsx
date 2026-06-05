import { ImageflowBridgeContent } from "@/components/imageflow/imageflow-bridge-content";
import { readCachedProducts } from "@/lib/ecommerce/cache";
import { listImageflowJobs } from "@/lib/imageflow/store";

export const dynamic = "force-dynamic";

export default async function ImageflowBridgePage() {
  const [jobs, products] = await Promise.all([listImageflowJobs(40), readCachedProducts({ limit: 30 })]);
  return <ImageflowBridgeContent initialJobs={jobs} products={products} />;
}
