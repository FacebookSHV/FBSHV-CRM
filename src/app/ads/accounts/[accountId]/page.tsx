import { AdsAccountDetailContent } from "@/components/facebook/ads-account-detail-content";

export const dynamic = "force-dynamic";

export default async function AdsAccountPage({
  params
}: {
  params: Promise<{ accountId: string }>;
}) {
  const { accountId } = await params;
  return <AdsAccountDetailContent accountId={decodeURIComponent(accountId)} />;
}
