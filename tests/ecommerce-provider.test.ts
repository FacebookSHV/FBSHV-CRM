import { afterEach, describe, expect, it, vi } from "vitest";
import { POST as createFacebookOrder } from "@/app/api/ecommerce/orders/from-facebook/route";
import { HttpEcommerceManagementProvider } from "@/lib/ecommerce/http-provider";
import { getEcommerceProvider } from "@/lib/ecommerce/provider";
import { MockEcommerceManagementProvider } from "@/lib/ecommerce/mock-provider";
import { canApplyLocalInventoryMutation } from "@/lib/orders/inventory-safety";

type ApiPayload<T> = {
  success: boolean;
  data: T;
  error?: string;
};

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
      apiKey: "test-key"
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
      apiKey: "test-key"
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
      apiKey: "test-key"
    });
    const result = await provider.checkInventory("SKU_REAL", 1);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.enoughStock).toBe(true);
  });
});
