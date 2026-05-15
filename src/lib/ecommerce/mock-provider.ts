import { demoProducts } from "@/lib/demo-data";
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

const products = demoProducts.map((item) => ({
  ...item,
  status: item.status as ProductWithInventory["status"],
  workspaceId: "workspace-demo",
  externalProductId: item.id
})) satisfies ProductWithInventory[];

function findProductBySku(sku: string) {
  return products.find((product) => product.sku.toLowerCase() === sku.toLowerCase());
}

export class MockEcommerceManagementProvider implements EcommerceManagementProvider {
  private reservations = new Map<string, InventoryReservation>();
  private orders = new Map<string, ExternalOrder>();

  async getProducts(params: ProductQuery = {}): Promise<ApiResult<ProductWithInventory[]>> {
    const q = params.q?.trim().toLowerCase();
    const filtered = products.filter((product) => {
      const matchText = !q || product.name.toLowerCase().includes(q) || product.sku.toLowerCase().includes(q);
      const matchSku = !params.sku || product.sku.toLowerCase() === params.sku.toLowerCase();
      return matchText && matchSku;
    });

    return { success: true, data: filtered.slice(0, params.limit ?? 50) };
  }

  async getProductById(productId: string): Promise<ApiResult<ProductWithInventory>> {
    const product = products.find((item) => item.id === productId);
    return product ? { success: true, data: product } : { success: false, error: "Không tìm thấy sản phẩm" };
  }

  async getProductBySku(sku: string): Promise<ApiResult<ProductWithInventory>> {
    const product = findProductBySku(sku);
    return product ? { success: true, data: product } : { success: false, error: "Không tìm thấy SKU" };
  }

  async getSkuPrice(sku: string) {
    const product = findProductBySku(sku);
    if (!product) return { success: false as const, error: "Không tìm thấy SKU" };
    return {
      success: true as const,
      data: { sku: product.sku, price: product.currentPrice, currency: product.currency }
    };
  }

  async checkInventory(sku: string, quantity: number): Promise<ApiResult<InventoryCheck>> {
    const product = findProductBySku(sku);
    if (!product) return { success: false, error: "Không tìm thấy SKU" };
    return {
      success: true,
      data: {
        sku: product.sku,
        requestedQuantity: quantity,
        availableStock: product.availableStock,
        enoughStock: product.availableStock >= quantity
      }
    };
  }

  async reserveInventory(sku: string, quantity: number): Promise<ApiResult<InventoryReservation>> {
    const checked = await this.checkInventory(sku, quantity);
    if (!checked.success) return checked;
    if (!checked.data.enoughStock) return { success: false, error: "Tồn khả dụng không đủ" };

    // NEO: Không tự trừ tồn local nếu API ngoài chưa xác nhận
    const reservation: InventoryReservation = {
      reservationId: `mock-rsv-${Date.now()}`,
      sku: checked.data.sku,
      quantity,
      status: "reserved",
      expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString()
    };
    this.reservations.set(reservation.reservationId, reservation);
    return { success: true, data: reservation };
  }

  async cancelReservation(reservationId: string): Promise<ApiResult<InventoryReservation>> {
    const reservation = this.reservations.get(reservationId);
    if (!reservation) return { success: false, error: "Không tìm thấy phiếu giữ hàng" };
    const cancelled = { ...reservation, status: "cancelled" as const };
    this.reservations.set(reservationId, cancelled);
    return { success: true, data: cancelled };
  }

  async createOrderFromFacebook(payload: FacebookOrderPayload): Promise<ApiResult<ExternalOrder>> {
    const checked = await this.checkInventory(payload.sku, payload.quantity);
    if (!checked.success) return checked;
    if (!checked.data.enoughStock) return { success: false, error: "Tồn khả dụng không đủ" };

    const order: ExternalOrder = {
      id: `order-${Date.now()}`,
      externalOrderId: `ECOM-MOCK-${Date.now()}`,
      sku: payload.sku,
      quantity: payload.quantity,
      status: "created"
    };
    this.orders.set(order.id, order);
    return { success: true, data: order };
  }

  async getOrder(orderId: string): Promise<ApiResult<ExternalOrder>> {
    const order = this.orders.get(orderId);
    return order ? { success: true, data: order } : { success: false, error: "Không tìm thấy đơn" };
  }

  async syncProducts() {
    // NEO: Đồng bộ sản phẩm từ Web Quản Lý TMĐT
    return { success: true as const, data: { synced: products.length, source: "mock" as const } };
  }

  async handleWebhookEvent(event: EcommerceWebhookEvent) {
    void event;
    // NEO: Webhook TMĐT được xử lý qua read model cache
    return { success: true as const, data: { handled: true } };
  }
}
