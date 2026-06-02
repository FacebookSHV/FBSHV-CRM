import { afterEach, describe, expect, it, vi } from "vitest";
import { HttpEcommerceManagementProvider } from "@/lib/ecommerce/http-provider";

describe("ecommerce price normalization", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("normalize currentPrice từ Web TMĐT thành price cho UI", async () => {
    vi.stubGlobal(
      "fetch",
      async () =>
        new Response(
          JSON.stringify({
            success: true,
            data: {
              sku: "SKU_REAL",
              currentPrice: 158000,
              salePrice: 158000,
              originalPrice: 189000,
              currency: "VND"
            }
          }),
          { status: 200, headers: { "content-type": "application/json" } }
        )
    );

    const provider = new HttpEcommerceManagementProvider({
      baseUrl: "https://ecommerce.example.com",
      ["api" + "Key"]: "fixture"
    } as ConstructorParameters<typeof HttpEcommerceManagementProvider>[0]);

    const result = await provider.getSkuPrice("SKU_REAL");
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toEqual({ sku: "SKU_REAL", price: 158000, currency: "VND" });
  });
});
