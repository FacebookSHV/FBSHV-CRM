import { describe, expect, it } from "vitest";
import { buildTemplateFrameSpec, landingTemplates } from "@/lib/landing-pages/template-catalog";
import { readLandingRealProof } from "@/lib/landing-pages/real-proof";
import type { ProductWithInventory } from "@/lib/ecommerce/types";

function product(rawPayload: Record<string, unknown>): ProductWithInventory {
  const now = new Date().toISOString();
  return {
    id: "p1",
    workspaceId: "workspace-demo",
    externalProductId: "p1",
    sku: "SKU_TEST",
    name: "Sản phẩm test",
    category: "",
    costPrice: 0,
    originalPrice: 100000,
    salePrice: 80000,
    currentPrice: 80000,
    discountAmount: 20000,
    discountPercent: 20,
    currency: "VND",
    imageUrl: "",
    images: [],
    description: "",
    status: "active",
    rawPayload: JSON.stringify(rawPayload),
    priceUpdatedAt: now,
    syncedAt: now,
    stock: 10,
    availableStock: 10,
    reservedStock: 0,
    lowStockThreshold: 2
  };
}

describe("landing page AI generator integration", () => {
  it("imports commerce templates from supplied builder concepts without fake proof values", () => {
    expect(landingTemplates.map((item) => item.id)).toEqual(
      expect.arrayContaining([
        "tiktok_shop",
        "shopee_shop",
        "facebook_ads",
        "livestream_deal",
        "combo_saver",
        "flash_sale",
        "trust_builder",
        "brand_story",
        "minimal_clean",
        "bold_impact"
      ])
    );
    for (const template of landingTemplates) {
      expect(template.imageSlots).toHaveLength(5);
      expect(template.conversionBlocks.length).toBeGreaterThan(0);
      expect(template.copyAngle).not.toContain("9.3k");
      expect(template.description).not.toContain("12.847");
    }
  });

  it("builds slot-specific 4:5 frame spec for ImageFlow/CDP automation", () => {
    const spec = buildTemplateFrameSpec("shopee_shop");
    expect(spec.output).toMatchObject({ aspectRatio: "4:5", width: 1080, height: 1350, count: 5 });
    expect(spec.slots.map((slot) => slot.role)).toEqual([
      "hero",
      "problem_solution",
      "feature_proof",
      "installation",
      "offer_proof"
    ]);
    expect(spec.proofPolicy.neverInvent).toBe(true);
    expect(spec.proofPolicy.keepWhenReal).toContain("soldCount");
    expect(spec.negativePrompt.join(" ")).toContain("Không bịa");
  });

  it("reads sold count, rating, countdown, and testimonials only from real product payload", () => {
    const proof = readLandingRealProof(product({
      soldCount: 123,
      ratingAverage: 4.8,
      reviewCount: 17,
      promotionEndsAt: new Date(Date.now() + 60_000).toISOString(),
      reviews: [{ name: "Anh A", text: "Hàng đúng mẫu", rating: 5 }]
    }));
    expect(proof.soldCount).toBe(123);
    expect(proof.rating).toBe(4.8);
    expect(proof.reviewCount).toBe(17);
    expect(proof.campaignEndsAt).toBeTruthy();
    expect(proof.testimonials[0]?.text).toBe("Hàng đúng mẫu");
  });

  it("does not synthesize conversion proof when Product Core has no proof fields", () => {
    const proof = readLandingRealProof(product({}));
    expect(proof.soldCount).toBeNull();
    expect(proof.rating).toBeNull();
    expect(proof.reviewCount).toBeNull();
    expect(proof.campaignEndsAt).toBeNull();
    expect(proof.testimonials).toEqual([]);
  });
});
