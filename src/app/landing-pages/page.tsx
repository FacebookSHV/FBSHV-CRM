import { LandingPagesContent } from "@/components/landing-pages/landing-pages-content";
import { readCachedProducts } from "@/lib/ecommerce/cache";
import { listLandingPages, listLandingTemplates } from "@/lib/landing-pages/store";

export const dynamic = "force-dynamic";

export default async function LandingPagesPage() {
  const [pages, templates, products] = await Promise.all([
    listLandingPages(),
    Promise.resolve(listLandingTemplates()),
    readCachedProducts({ limit: 20 })
  ]);
  return <LandingPagesContent initialPages={pages} templates={templates} products={products} />;
}
