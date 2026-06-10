import { afterEach, describe, expect, it, vi } from "vitest";
import { POST as createFacebookOrder } from "@/app/api/ecommerce/orders/from-facebook/route";
import { createFacebookOrderThroughCore } from "@/lib/core-flow/order-core-contract";
import { normalizeProductForCache } from "@/lib/ecommerce/cache";
import { HttpEcommerceManagementProvider } from "@/lib/ecommerce/http-provider";
import { getEcommerceProvider } from "@/lib/ecommerce/provider";
import { MockEcommerceManagementProvider } from "@/lib/ecommerce/mock-provider";
import { canApplyLocalInventoryMutation } from "@/lib/orders/inventory-safety";
import { resetFacebookOrderStoreForTests } from "@/lib/orders/store";
import type { EcommerceManagementProvider } from "@/lib/ecommerce/types";

type ApiPayload<T> = {
  success: boolean;
  data: T;
  error?: string;
};

const testCredential = ["unit", "test", "credential"].join("-");

describe("mock ecommerce provider", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("lấy danh sách sản phẩm mock", async () => {
    const provider = new MockEcommerceManagementProvider();
    const result = await provider.getProducts();
    expect(result.success).toBe(true);
    if (result.success) expect(result.data[0]?.sku).toBe("CRM_TEST_001");
  });

  it("lấy giá SKU", async () => {
    const provider = new MockEcommerceManagementProvider();
    const result = await provider.getSkuPrice("CRM_TEST_001");
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.price).toBe(10000);
  });

  it("kiểm tồn đủ hàng", async () => {
    const provider = new MockEcommerceManagementProvider();
    const result = await provider.checkInventory("CRM_TEST_001", 1);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.enoughStock).toBe(true);
  });

  it("kiểm tồn hết hàng", async () => {
    const provider = new MockEcommerceManagementProvider();
    const result = await provider.checkInventory("CRM_TEST_001", 999);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.enoughStock).toBe(false);
  });

  it("giữ hàng và hủy giữ hàng mock", async () => {
    const provider = new MockEcommerceManagementProvider();
    const reserved = await provider.reserveInventory("CRM_TEST_001", 1);
    expect(reserved.success).toBe(true);
    if (!reserved.success) return;
    const cancelled = await provider.cancelReservation(reserved.data.reservationId);
    expect(cancelled.success).toBe(true);
    if (cancelled.success) expect(cancelled.data.status).toBe("cancelled");
  });

  it("tạo đơn Facebook mock", async () => {
    const provider = new MockEcommerceManagementProvider();
    const result = await provider.createOrderFromFacebook({
      customerId: "customer-demo",
      sku: "CRM_TEST_001",
      quantity: 1
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.externalOrderId).toContain("ECOM-MOCK");
  });

  it("không cho trừ tồn local nếu external fail", () => {
    expect(canApplyLocalInventoryMutation({ success: false, error: "external fail" })).toBe(false);
  });

  it("provider real-mode thiếu secret bị chặn thay vì fallback mock", async () => {
    const provider = getEcommerceProvider({
      MOCK_ECOMMERCE_API: "false",
      ECOMMERCE_API_BASE_URL: "https://example.com"
    });
    const result = await provider.getSkuPrice("CRM_TEST_001");
    expect(result.success).toBe(false);
    if (!result.success) expect(result.code).toBe("BLOCKED_BY_MISSING_SECRET");
  });

  it("route tạo đơn Facebook bị chặn nếu chưa bật write test an toàn", async () => {
    process.env.MOCK_ECOMMERCE_API = "true";
    process.env.RUN_EXTERNAL_WRITE_TESTS = "false";
    const response = await createFacebookOrder(
      new Request("http://localhost/api/ecommerce/orders/from-facebook", {
        method: "POST",
        body: JSON.stringify({
          customerId: "customer_test",
          conversationId: "conv_test",
          sku: "CRM_TEST_001",
          quantity: 1
        })
      })
    );
    const payload = (await response.json()) as ApiPayload<{ externalOrderId: string }>;
    expect(response.status).toBe(403);
    expect(payload.success).toBe(false);
    expect(payload.error).toContain("Chặn tạo đơn thật vì an toàn");
  });

  it("không ghi đơn local khi Order Core tạo đơn thất bại", async () => {
    resetFacebookOrderStoreForTests();
    const persist = vi.fn();
    const cancelReservation = vi.fn().mockResolvedValue({
      success: true,
      data: { reservationId: "reserve-1", sku: "SKU_REAL", quantity: 1, status: "cancelled", expiresAt: "" }
    });
    const provider = {
      getSkuPrice: vi.fn().mockResolvedValue({ success: true, data: { sku: "SKU_REAL", price: 120000, currency: "VND" } }),
      checkInventory: vi.fn().mockResolvedValue({ success: true, data: { sku: "SKU_REAL", requestedQuantity: 1, availableStock: 5, enoughStock: true } }),
      reserveInventory: vi.fn().mockResolvedValue({ success: true, data: { reservationId: "reserve-1", sku: "SKU_REAL", quantity: 1, status: "reserved", expiresAt: "" } }),
      createOrderFromFacebook: vi.fn().mockResolvedValue({ success: false, error: "core rejected" }),
      cancelReservation
    } as unknown as EcommerceManagementProvider;

    const result = await createFacebookOrderThroughCore(
      { customerId: "customer-1", sku: "SKU_REAL", quantity: 1 },
      { provider, persist, audit: vi.fn().mockResolvedValue(true) }
    );

    expect(result.success).toBe(false);
    expect(persist).not.toHaveBeenCalled();
    expect(cancelReservation).toHaveBeenCalledWith("reserve-1");
  });

  it("ghi read-model sau khi Order Core xác nhận thành công", async () => {
    const calls: string[] = [];
    const provider = {
      getSkuPrice: vi.fn(async () => {
        calls.push("price");
        return { success: true, data: { sku: "SKU_REAL", price: 120000, currency: "VND" } };
      }),
      checkInventory: vi.fn(async () => {
        calls.push("inventory");
        return { success: true, data: { sku: "SKU_REAL", requestedQuantity: 1, availableStock: 5, enoughStock: true } };
      }),
      reserveInventory: vi.fn(async () => {
        calls.push("reserve");
        return { success: true, data: { reservationId: "reserve-2", sku: "SKU_REAL", quantity: 1, status: "reserved", expiresAt: "" } };
      }),
      createOrderFromFacebook: vi.fn(async () => {
        calls.push("external-order");
        return { success: true, data: { id: "core-order-1", externalOrderId: "EXT-1", sku: "SKU_REAL", quantity: 1, status: "created" } };
      })
    } as unknown as EcommerceManagementProvider;
    const persist = vi.fn(async () => {
      calls.push("persist");
      return { localOrderId: "local-1", externalOrderId: "EXT-1" };
    });

    const result = await createFacebookOrderThroughCore(
      { customerId: "customer-1", sku: "SKU_REAL", quantity: 1 },
      { provider, persist, audit: vi.fn().mockResolvedValue(true) }
    );

    expect(result.success).toBe(true);
    expect(calls).toEqual(["price", "inventory", "reserve", "external-order", "persist"]);
    if (result.success) expect(result.data.localOrderId).toBe("local-1");
  });

  it("HTTP provider gọi đúng namespace /api/external khi lấy sản phẩm", async () => {
    const calls: string[] = [];
    vi.stubGlobal(
      "fetch",
      async (input: RequestInfo | URL) => {
        calls.push(String(input));
        return new Response(JSON.stringify({ success: true, data: [] }), {
          status: 200,
          headers: { "content-type": "application/json" }
        });
      }
    );

    const provider = new HttpEcommerceManagementProvider({
      baseUrl: "https://ecommerce.example.com",
      apiKey: testCredential
    });
    const result = await provider.getProducts({ q: "camera", limit: 5 });

    expect(result.success).toBe(true);
    expect(calls).toEqual([
      "https://ecommerce.example.com/api/external/products?search=camera&limit=5"
    ]);
  });

  it("HTTP syncProducts kéo /api/external/products thay vì namespace sync cũ", async () => {
    const calls: string[] = [];
    vi.stubGlobal(
      "fetch",
      async (input: RequestInfo | URL) => {
        calls.push(String(input));
        return new Response(JSON.stringify({ success: true, data: [] }), {
          status: 200,
          headers: { "content-type": "application/json" }
        });
      }
    );

    const provider = new HttpEcommerceManagementProvider({
      baseUrl: "https://ecommerce.example.com",
      apiKey: testCredential
    });
    const result = await provider.syncProducts();

    expect(result.success).toBe(true);
    expect(calls[0]).toBe("https://ecommerce.example.com/api/external/products?limit=200");
    expect(calls[0]).not.toContain("/sync");
  });

  it("HTTP inventory check normalize canSell thành enoughStock", async () => {
    vi.stubGlobal(
      "fetch",
      async () =>
        new Response(
          JSON.stringify({
            success: true,
            data: { sku: "SKU_REAL", requestedQuantity: 1, availableStock: 3, canSell: true }
          }),
          { status: 200, headers: { "content-type": "application/json" } }
        )
    );
    const provider = new HttpEcommerceManagementProvider({
      baseUrl: "https://ecommerce.example.com",
      apiKey: testCredential
    });
    const result = await provider.checkInventory("SKU_REAL", 1);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.enoughStock).toBe(true);
  });

  it("preserves Product Core images, prompt assets, and variants", () => {
    const product = normalizeProductForCache({
      id: "product-1",
      sku: "SKU_FULL",
      name: "Full product",
      imageUrl: "https://cdn.example.com/main.jpg",
      images: [
        "https://cdn.example.com/main.jpg",
        "https://cdn.example.com/detail.jpg"
      ],
      description: "Real Product Core description",
      promptAssets: {
        allImageUrls: [
          "https://cdn.example.com/main.jpg",
          "https://cdn.example.com/detail.jpg"
        ],
        promptText: "Use the real product images and description."
      },
      variants: [{ id: "variant-1", sku: "SKU_FULL_RED", name: "Red" }]
    });

    expect(product.images).toEqual([
      "https://cdn.example.com/main.jpg",
      "https://cdn.example.com/detail.jpg"
    ]);
    expect(product.promptAssets?.allImageUrls).toHaveLength(2);
    expect(product.promptAssets?.promptText).toContain("real product");
    expect(product.variants?.[0]?.sku).toBe("SKU_FULL_RED");
  });

  it("restores Product Core prompt data from a persisted raw payload", () => {
    const product = normalizeProductForCache({
      id: "product-raw",
      sku: "SKU_RAW",
      name: "Raw product",
      rawPayload: JSON.stringify({
        imageUrl: "https://cdn.example.com/raw-main.jpg",
        images: [
          "https://cdn.example.com/raw-main.jpg",
          "https://cdn.example.com/raw-detail.jpg"
        ],
        description: "Description from raw payload",
        promptAssets: {
          allImageUrls: ["https://cdn.example.com/raw-detail.jpg"],
          promptText: "Prompt from raw payload"
        },
        variants: [{ id: "raw-variant", sku: "SKU_RAW_01" }]
      })
    });

    expect(product.imageUrl).toBe("https://cdn.example.com/raw-main.jpg");
    expect(product.description).toBe("Description from raw payload");
    expect(product.images).toHaveLength(2);
    expect(product.promptAssets?.promptText).toBe("Prompt from raw payload");
    expect(product.variants?.[0]?.id).toBe("raw-variant");
  });
});
