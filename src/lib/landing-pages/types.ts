import type { ProductWithInventory } from "@/lib/ecommerce/types";

export type LandingTemplateId = "sales_fast" | "video_guide" | "compare";
export type LandingPageStatus = "draft" | "published" | "archived";

export type LandingHero = {
  headline: string;
  subheadline: string;
  bullets: string[];
  primaryCta: string;
  secondaryCta: string;
};

export type LandingSections = {
  trustBadges: string[];
  benefits: Array<{ title: string; text: string }>;
  steps: Array<{ title: string; text: string }>;
  faq: Array<{ question: string; answer: string }>;
  offerNote: string;
};

export type LandingSeo = {
  title: string;
  description: string;
};

export type LandingVariant = {
  id: string;
  variantKey: string;
  name: string;
  weight: number;
  templateId: LandingTemplateId;
  content: {
    hero: LandingHero;
    sections: LandingSections;
    seo: LandingSeo;
  };
};

export type LandingPage = {
  id: string;
  slug: string;
  title: string;
  productSku: string;
  templateId: LandingTemplateId;
  status: LandingPageStatus;
  hero: LandingHero;
  sections: LandingSections;
  seo: LandingSeo;
  product: ProductWithInventory | null;
  variant: LandingVariant | null;
  creativeImages: string[];
  imageJobQueued?: boolean;
  imageJobError?: string | null;
  aiMode?: "ai" | "template";
  aiNotice?: string | null;
  publicUrl: string;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
  metrics?: {
    views: number;
    leads: number;
    contacts: number;
  };
};

export type LandingTemplate = {
  id: LandingTemplateId;
  name: string;
  description: string;
  bestFor: string;
};
