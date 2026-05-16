import type {
  ApiResult,
  EcommerceManagementProvider,
  EcommerceWebhookEvent,
  ExternalOrder,
  FacebookOrderPayload,
  InventoryCheck,
  InventoryReservation,
  ProductQuery,
  ProductWithInventory
} from "./types";

type HttpProviderOptions = {
  baseUrl: string;
  apiKey: string;
};

export class HttpEcommerceManagementProvider implements EcommerceManagementProvider {
  constructor(private readonly options: HttpProviderOptions) {}

  private async request<T>(path: string, init: RequestInit = {}): Promise<ApiResult<T>> {
    const url = new URL(path, this.options.baseUrl);
    const response = await fetch(url, {
      ...init,
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${this.options.apiKey}`,
        ...(init.headers ?? {})
      }
    });
    const payload = (await response.json().catch(() => null)) as ApiResult<T> | null;

    if (!response.ok) {
      return {
        success: false,
        error: payload?.success === false ? payload.error : "API TMĐT trả lỗi"
      };
    }
    return payload ?? { success: false, error: "API TMĐT trả dữ liệu không hợp lệ" };
  }

  getProducts(params: ProductQuery = {}) {
    const search = new URLSearchParams();
    if (params.q) search.set("search", params.q);
    if (params.sku) search.set("sku", params.sku);
    if (params.limit) search.set("limit", String(params.limit));
    return this.request<ProductWithInventory[]>(`/api/external/products?${search}`);
  }

  getProductById(productId: string) {
    return this.request<ProductWithInventory>(`/api/external/products/${encodeURIComponent(productId)}`);
  }

  getProductBySku(sku: string) {
    return this.request<ProductWithInventory>(`/api/external/products/sku/${encodeURIComponent(sku)}`);
  }

  getSkuPrice(sku: string) {
    return this.request<{ sku: string; price: number; currency: string }>(
      `/api/external/products/sku/${encodeURIComponent(sku)}/price`
    );
  }

  checkInventory(sku: string, quantity: number) {
    return this.request<InventoryCheck>("/api/external/inventory/check", {
      method: "POST",
      body: JSON.stringify({ sku, quantity })
    });
  }

  reserveInventory(sku: string, quantity: number, metadata?: Record<string, unknown>) {
    return this.request<InventoryReservation>("/api/external/inventory/reserve", {
      method: "POST",
      headers:
        typeof metadata?.idempotencyKey === "string"
          ? { "Idempotency-Key": metadata.idempotencyKey }
          : undefined,
      body: JSON.stringify({ sku, quantity, metadata })
    });
  }

  cancelReservation(reservationId: string) {
    return this.request<InventoryReservation>(
      `/api/external/inventory/reservations/${encodeURIComponent(reservationId)}/cancel`,
      { method: "POST" }
    );
  }

  createOrderFromFacebook(payload: FacebookOrderPayload) {
    return this.request<ExternalOrder>("/api/external/orders/from-facebook", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  }

  getOrder(orderId: string) {
    return this.request<ExternalOrder>(`/api/external/orders/${encodeURIComponent(orderId)}`);
  }

  syncProducts() {
    return this.request<{ synced: number; source: "mock" | "http" }>("/api/external/products/sync", {
      method: "POST"
    });
  }

  handleWebhookEvent(event: EcommerceWebhookEvent) {
    return this.request<{ handled: boolean }>("/api/external/webhooks/ecommerce", {
      method: "POST",
      body: JSON.stringify(event)
    });
  }
}
