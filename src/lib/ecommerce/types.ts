export type ApiResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; code?: string };

export type ProductCacheItem = {
  id: string;
  workspaceId: string;
  externalProductId: string;
  sku: string;
  name: string;
  category: string;
  costPrice: number;
  originalPrice: number;
  salePrice: number;
  currentPrice: number;
  discountAmount: number;
  discountPercent: number;
  currency: string;
  imageUrl: string;
  description: string;
  status: "active" | "inactive" | "low_stock";
  source?: string;
  rawPayload?: string;
  missingFromSource?: boolean;
  priceUpdatedAt: string;
  syncedAt: string;
};

export type InventoryCacheItem = {
  id: string;
  workspaceId: string;
  sku: string;
  stock: number;
  availableStock: number;
  reservedStock: number;
  lowStockThreshold: number;
  syncedAt: string;
};

export type ProductWithInventory = ProductCacheItem & InventoryCacheItem;

export type InventoryCheck = {
  sku: string;
  requestedQuantity: number;
  availableStock: number;
  enoughStock: boolean;
};

export type InventoryReservation = {
  reservationId: string;
  sku: string;
  quantity: number;
  status: "reserved" | "cancelled";
  expiresAt: string;
};

export type FacebookOrderPayload = {
  customerId: string;
  conversationId?: string;
  sku: string;
  quantity: number;
  currentPrice?: number;
  currency?: string;
  reservationId?: string;
  sourceOrderId?: string;
  note?: string;
};

export type ExternalOrder = {
  id: string;
  externalOrderId: string;
  sku: string;
  quantity: number;
  status: "created" | "pending" | "failed";
};

export type EcommerceWebhookEvent = {
  eventId: string;
  type: string;
  occurredAt: string;
  data: Record<string, unknown>;
};

export type ProductQuery = {
  q?: string;
  sku?: string;
  limit?: number;
};

export type ProductSyncSummary = {
  lastSyncedAt: string | null;
  syncedCount: number;
  status: string | null;
  error: string | null;
};

export interface EcommerceManagementProvider {
  getProducts(params?: ProductQuery): Promise<ApiResult<ProductWithInventory[]>>;
  getProductById(productId: string): Promise<ApiResult<ProductWithInventory>>;
  getProductBySku(sku: string): Promise<ApiResult<ProductWithInventory>>;
  getSkuPrice(sku: string): Promise<ApiResult<{ sku: string; price: number; currency: string }>>;
  checkInventory(sku: string, quantity: number): Promise<ApiResult<InventoryCheck>>;
  reserveInventory(
    sku: string,
    quantity: number,
    metadata?: Record<string, unknown>
  ): Promise<ApiResult<InventoryReservation>>;
  cancelReservation(reservationId: string): Promise<ApiResult<InventoryReservation>>;
  createOrderFromFacebook(payload: FacebookOrderPayload): Promise<ApiResult<ExternalOrder>>;
  getOrder(orderId: string): Promise<ApiResult<ExternalOrder>>;
  syncProducts(): Promise<ApiResult<{ synced: number; source: "mock" | "http" }>>;
  handleWebhookEvent(event: EcommerceWebhookEvent): Promise<ApiResult<{ handled: boolean }>>;
}
