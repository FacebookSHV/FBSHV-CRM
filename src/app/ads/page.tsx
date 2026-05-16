import { AdsContent } from "@/components/facebook/ads-content";
import { getAdsReadiness } from "@/lib/facebook/ads";

export const dynamic = "force-dynamic";

export default async function AdsPage() {
  const readiness = await getAdsReadiness();
  return <AdsContent initialReadiness={readiness} />;
}
