import type {
  ApiResult,
  EcommerceManagementProvider,
  ExternalOrder,
  InventoryCheck,
  InventoryReservation,
  ProductWithInventory
} from "./types";

export class BlockedEcommerceManagementProvider implements EcommerceManagementProvider {
  constructor(private readonly missing: string[]) {}

  private blocked<T>(): Promise<ApiResult<T>> {
    return Promise.resolve({
      success: false,
      code: "BLOCKED_BY_MISSING_SECRET",
      error: `BLOCKED_BY_MISSING_SECRET: ${this.missing.join(", ")}`
    });
  }

  getProducts(): Promise<ApiResult<ProductWithInventory[]>> {
    return this.blocked();
  }

  getProductById(): Promise<ApiResult<ProductWithInventory>> {
    return this.blocked();
  }

  getProductBySku(): Promise<ApiResult<ProductWithInventory>> {
    return this.blocked();
  }

  getSkuPrice(): Promise<ApiResult<{ sku: string; price: number; currency: string }>> {
    return this.blocked();
  }

  checkInventory(): Promise<ApiResult<InventoryCheck>> {
    return this.blocked();
  }

  reserveInventory(): Promise<ApiResult<InventoryReservation>> {
    return this.blocked();
  }

  cancelReservation(): Promise<ApiResult<InventoryReservation>> {
    return this.blocked();
  }

  createOrderFromFacebook(): Promise<ApiResult<ExternalOrder>> {
    return this.blocked();
  }

  getOrder(): Promise<ApiResult<ExternalOrder>> {
    return this.blocked();
  }

  syncProducts(): Promise<ApiResult<{ synced: number; source: "mock" | "http" }>> {
    return this.blocked();
  }

  handleWebhookEvent(): Promise<ApiResult<{ handled: boolean }>> {
    return this.blocked();
  }
}
