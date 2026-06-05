import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LandingPagePublic } from "@/components/landing-pages/landing-page-public";
import { getLandingPageBySlug } from "@/lib/landing-pages/store";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const page = await getLandingPageBySlug(slug);
  if (!page) return { title: "Landing page không tồn tại" };
  return {
    title: page.seo.title,
    description: page.seo.description,
    openGraph: {
      title: page.seo.title,
      description: page.seo.description,
      images: page.creativeImages[0] || page.product?.imageUrl ? [page.creativeImages[0] || page.product?.imageUrl || ""] : undefined
    }
  };
}

export default async function PublicLandingPage({
  params
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const page = await getLandingPageBySlug(slug);
  if (!page) notFound();
  return <LandingPagePublic page={page} />;
}
