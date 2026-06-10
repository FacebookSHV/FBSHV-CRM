import type { ProductWithInventory } from "@/lib/ecommerce/types";

export type LandingTestimonial = {
  name: string;
  text: string;
  rating: number | null;
};

export type LandingRealProof = {
  soldCount: number | null;
  rating: number | null;
  reviewCount: number | null;
  campaignEndsAt: string | null;
  testimonials: LandingTestimonial[];
};

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function parseRaw(value: string | undefined) {
  try {
    return record(JSON.parse(value || "{}"));
  } catch {
    return {};
  }
}

function numberValue(...values: unknown[]) {
  for (const value of values) {
    if (value === null || value === undefined || value === "") continue;
    const parsed = typeof value === "number" ? value : Number(String(value).replace(/[^\d.-]/g, ""));
    if (Number.isFinite(parsed) && parsed >= 0) return parsed;
  }
  return null;
}

function stringValue(...values: unknown[]) {
  for (const value of values) {
    const text = typeof value === "string" ? value.trim() : "";
    if (text) return text;
  }
  return "";
}

function arrayValue(...values: unknown[]) {
  for (const value of values) {
    if (Array.isArray(value)) return value;
  }
  return [];
}

// NEO: Social proof chỉ đọc dữ liệu thật trong Product Core, không sinh số mẫu.
export function readLandingRealProof(product: ProductWithInventory | null): LandingRealProof {
  if (!product) return { soldCount: null, rating: null, reviewCount: null, campaignEndsAt: null, testimonials: [] };
  const raw = parseRaw(product.rawPayload);
  const stats = record(raw.stats ?? raw.statistics ?? raw.metrics);
  const review = record(raw.review ?? raw.reviewsSummary ?? raw.ratingSummary);
  const promotion = record(raw.promotion ?? raw.campaign ?? raw.flashSale);
  const testimonials = arrayValue(raw.reviews, raw.testimonials, raw.customerReviews)
    .map((item) => {
      const source = record(item);
      const text = stringValue(source.text, source.content, source.comment, source.review);
      if (!text) return null;
      return {
        name: stringValue(source.name, source.customerName, source.author, source.buyerName) || "Khách đã mua",
        text: text.slice(0, 260),
        rating: numberValue(source.rating, source.stars)
      };
    })
    .filter((item): item is LandingTestimonial => Boolean(item))
    .slice(0, 6);
  const end = stringValue(
    promotion.endsAt,
    promotion.endAt,
    promotion.endTime,
    raw.campaignEndsAt,
    raw.promotionEndsAt
  );
  const endTime = end && Number.isFinite(Date.parse(end)) && Date.parse(end) > Date.now() ? new Date(end).toISOString() : null;
  return {
    soldCount: numberValue(raw.soldCount, raw.sold, raw.historicalSold, stats.soldCount, stats.sold),
    rating: numberValue(raw.rating, raw.ratingAverage, review.rating, review.average),
    reviewCount: numberValue(raw.reviewCount, raw.ratingCount, review.count, review.total),
    campaignEndsAt: endTime,
    testimonials
  };
}
