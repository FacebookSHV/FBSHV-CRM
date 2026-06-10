export type FacebookImagePlacement = "feed" | "banner" | "story" | "logo";

export type FacebookImagePreset = {
  key: FacebookImagePlacement;
  label: string;
  description: string;
  targetFormat: string;
  aspectRatio: string;
  width: number;
  height: number;
  defaultCount: number;
  countOptions: number[];
  roles: Array<{ role: string; instruction: string }>;
};

export const facebookImagePresets: Record<FacebookImagePlacement, FacebookImagePreset> = {
  feed: {
    key: "feed",
    label: "Feed 4:5",
    description: "Bai dang va quang cao Feed Facebook/Instagram, dung 1080x1350.",
    targetFormat: "facebook_feed",
    aspectRatio: "4:5",
    width: 1080,
    height: 1350,
    defaultCount: 5,
    countOptions: [1, 2, 3, 4, 5, 6, 8],
    roles: [
      { role: "feed_hook", instruction: "Hook pain point, product visible in top 2/3, CTA safe at bottom." },
      { role: "feed_product_hero", instruction: "Main product hero, exact product identity, no invented use case." },
      { role: "feed_feature_detail", instruction: "Close-up real feature/detail from references only." },
      { role: "feed_how_to_use", instruction: "How-to or installation frame only if supported by real references/product text." },
      { role: "feed_offer_cta", instruction: "Offer/CTA frame using real price/stock/campaign data only." }
    ]
  },
  banner: {
    key: "banner",
    label: "Banner Page",
    description: "Anh bia Facebook Page 820x312, noi dung chinh nam trong safe zone giua.",
    targetFormat: "facebook_banner",
    aspectRatio: "820:312",
    width: 820,
    height: 312,
    defaultCount: 1,
    countOptions: [1, 2, 3],
    roles: [
      { role: "page_cover_banner", instruction: "Wide store/page cover, brand and product clear, key text inside center safe zone." },
      { role: "campaign_banner", instruction: "Wide campaign banner with product, benefit and CTA, no small text near edges." },
      { role: "trust_banner", instruction: "Trust/support banner with warranty/shipping/service signals only when real." }
    ]
  },
  story: {
    key: "story",
    label: "Story/Reels",
    description: "Anh doc 1080x1920 cho Story/Reels, giu text trong vung an toan.",
    targetFormat: "facebook_story",
    aspectRatio: "9:16",
    width: 1080,
    height: 1920,
    defaultCount: 3,
    countOptions: [1, 2, 3, 4, 5],
    roles: [
      { role: "story_hook", instruction: "Full-screen mobile hook, product in middle safe area, strong thumb-stop headline." },
      { role: "story_feature", instruction: "One clear benefit or feature, large readable text, no overcrowding." },
      { role: "story_cta", instruction: "CTA frame for inbox/order intent, real offer data only." }
    ]
  },
  logo: {
    key: "logo",
    label: "Logo/Avatar",
    description: "Anh vuong 170x170 cho avatar/logo, hien thi tot khi bi cat tron.",
    targetFormat: "facebook_logo",
    aspectRatio: "1:1",
    width: 170,
    height: 170,
    defaultCount: 1,
    countOptions: [1, 2, 3],
    roles: [
      { role: "store_avatar", instruction: "Simple recognizable store avatar, key element inside center circle." },
      { role: "product_icon_avatar", instruction: "Product-icon avatar, minimal detail readable at 20px thumbnail." },
      { role: "brand_mark_avatar", instruction: "Clean brand mark with high contrast and no crowded text." }
    ]
  }
};

export function buildFacebookFrameSpec(preset: FacebookImagePreset, count: number) {
  const roles = Array.from({ length: count }, (_, index) => preset.roles[index % preset.roles.length]);
  return {
    channel: "facebook_ads",
    placement: preset.key,
    output: { aspectRatio: preset.aspectRatio, width: preset.width, height: preset.height, count },
    safeArea: {
      feed: "Keep text, price, logo and product away from edges; main product must be fully visible.",
      banner: "Keep key content inside the center 640px safe area for Facebook mobile cover display.",
      story: "Avoid the top and bottom 250px UI zones; keep CTA and product in the center safe area.",
      logo: "Keep the key mark inside a centered circle; readable at small thumbnail size."
    }[preset.key],
    slots: roles.map((role, index) => ({
      index,
      role: role.role,
      frame: `${preset.label} ${preset.width}x${preset.height}`,
      instruction: role.instruction
    })),
    negativePrompt: [
      "Do not change the physical product identity shown in references.",
      "Do not invent unsupported use cases, materials, accessories, ratings, sold counts, testimonials, countdowns, warranties, or discounts.",
      "Do not place text or product too close to the image edge.",
      "Do not use dense small text; every text block must be readable on mobile.",
      "If product data and references conflict, references and Product Core facts win."
    ]
  };
}
