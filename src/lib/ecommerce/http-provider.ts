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
import { ExternalCoreClient } from "@/lib/core-flow/external-core-client";

type HttpProviderOptions = {
  baseUrl: string;
  apiKey: string;
};

type ExternalPricePayload = {
  sku?: string;
  price?: number;
  currentPrice?: number;
  salePrice?: number;
  originalPrice?: number;
  currency?: string;
};

function normalizePricePayload(sku: string, payload: ExternalPricePayload) {
  const price = Number(payload.price ?? payload.currentPrice ?? payload.salePrice ?? payload.originalPrice ?? 0);
  return {
    sku: payload.sku || sku,
    price: Number.isFinite(price) ? price : 0,
    currency: payload.currency || "VND"
  };
}

export class HttpEcommerceManagementProvider implements EcommerceManagementProvider {
  private readonly client: ExternalCoreClient;

  constructor(private readonly options: HttpProviderOptions) {
    this.client = new ExternalCoreClient(options);
  }

  private async request<T>(path: string, init: RequestInit = {}): Promise<ApiResult<T>> {
    // NEO: External Core calls fail fast with timeout/retry/circuit breaker, không treo request CRM.
    return this.client.request<T>(path, init);
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

  async getSkuPrice(sku: string) {
    const result = await this.request<ExternalPricePayload>(
      `/api/external/products/sku/${encodeURIComponent(sku)}/price`
    );
    if (!result.success) return result;
    // NEO: API TMĐT có thể trả currentPrice/salePrice; CRM normalize thành price để UI không hiển thị 0 giả.
    return { success: true as const, data: normalizePricePayload(sku, result.data) };
  }

  async checkInventory(sku: string, quantity: number) {
    const result = await this.request<
      Partial<InventoryCheck> & { stock?: number; reservedStock?: number; canSell?: boolean; message?: string }
    >("/api/external/inventory/check", {
      method: "POST",
      body: JSON.stringify({ sku, quantity })
    });
    if (!result.success) return result;
    const availableStock = Number(result.data.availableStock ?? result.data.stock ?? 0);
    return {
      success: true as const,
      data: {
        sku: result.data.sku || sku,
        requestedQuantity: Number(result.data.requestedQuantity ?? quantity),
        availableStock,
        enoughStock: Boolean(result.data.enoughStock ?? result.data.canSell ?? availableStock >= quantity)
      }
    };
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
    return this.getProducts({ limit: 200 }).then((result) =>
      result.success
        ? { success: true as const, data: { synced: result.data.length, source: "http" as const } }
        : { success: false as const, error: result.error, code: result.code }
    );
  }

  handleWebhookEvent(event: EcommerceWebhookEvent) {
    return this.request<{ handled: boolean }>("/api/external/webhooks/ecommerce", {
      method: "POST",
      body: JSON.stringify(event)
    });
  }
}
