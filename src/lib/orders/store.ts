import { getD1Database } from "@/lib/db";
import type { ExternalOrder, FacebookOrderPayload, InventoryReservation } from "@/lib/ecommerce/types";
import { DEFAULT_WORKSPACE_ID } from "@/lib/facebook/types";

export type PersistFacebookOrderInput = {
  payload: FacebookOrderPayload;
  externalOrder: ExternalOrder;
  reservation: InventoryReservation;
  unitPrice: number;
  currency: string;
  productName?: string;
};

export type PersistedFacebookOrder = {
  localOrderId: string;
  externalOrderId: string;
};

const memoryOrders = new Map<string, PersistedFacebookOrder>();
const memoryOrderStatuses = new Map<string, string>();

export function resetFacebookOrderStoreForTests() {
  memoryOrders.clear();
  memoryOrderStatuses.clear();
}

export async function persistFacebookOrderReadModel(
  input: PersistFacebookOrderInput
): Promise<PersistedFacebookOrder> {
  const existingMemory = memoryOrders.get(input.externalOrder.externalOrderId);
  if (existingMemory) return existingMemory;

  const db = await getD1Database();
  const createdAt = new Date().toISOString();
  const localOrderId = input.externalOrder.id || crypto.randomUUID();
  const persisted = { localOrderId, externalOrderId: input.externalOrder.externalOrderId };

  if (!db) {
    memoryOrders.set(input.externalOrder.externalOrderId, persisted);
    memoryOrderStatuses.set(input.externalOrder.externalOrderId, input.externalOrder.status);
    return persisted;
  }

  const existing = await db
    .prepare("SELECT order_id FROM external_order_references WHERE workspace_id = ? AND external_order_id = ? LIMIT 1")
    .bind(DEFAULT_WORKSPACE_ID, input.externalOrder.externalOrderId)
    .first<{ order_id: string }>();
  if (existing?.order_id) {
    return { localOrderId: existing.order_id, externalOrderId: input.externalOrder.externalOrderId };
  }

  const totalAmount = Math.max(0, Math.round(input.unitPrice * input.payload.quantity));
  await db.batch([
    db
      .prepare(
        `INSERT INTO orders
        (id, workspace_id, customer_id, conversation_id, status, total_amount, currency, external_order_id, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        localOrderId,
        DEFAULT_WORKSPACE_ID,
        input.payload.customerId,
        input.payload.conversationId ?? null,
        input.externalOrder.status,
        totalAmount,
        input.currency,
        input.externalOrder.externalOrderId,
        createdAt
      ),
    db
      .prepare(
        `INSERT INTO order_items
        (id, order_id, sku, name, quantity, unit_price, total_price)
        VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        crypto.randomUUID(),
        localOrderId,
        input.payload.sku,
        input.productName || input.payload.sku,
        input.payload.quantity,
        Math.round(input.unitPrice),
        totalAmount
      ),
    db
      .prepare(
        `INSERT INTO external_order_references
        (id, workspace_id, order_id, external_order_id, provider, status, created_at)
        VALUES (?, ?, ?, ?, 'ecommerce-management', ?, ?)`
      )
      .bind(
        crypto.randomUUID(),
        DEFAULT_WORKSPACE_ID,
        localOrderId,
        input.externalOrder.externalOrderId,
        input.externalOrder.status,
        createdAt
      ),
    db
      .prepare(
        `INSERT INTO inventory_reservation_references
        (id, workspace_id, order_id, sku, quantity, external_reservation_id, status, expires_at, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        crypto.randomUUID(),
        DEFAULT_WORKSPACE_ID,
        localOrderId,
        input.payload.sku,
        input.payload.quantity,
        input.reservation.reservationId,
        input.reservation.status,
        input.reservation.expiresAt || null,
        createdAt
      )
  ]);

  return persisted;
}

export async function updateFacebookOrderStatus(externalOrderId: string, status: string) {
  const db = await getD1Database();
  if (!db) {
    if (!memoryOrders.has(externalOrderId)) return { updated: 0 };
    memoryOrderStatuses.set(externalOrderId, status);
    return { updated: 1 };
  }

  const [orderResult, referenceResult] = await db.batch([
    db
      .prepare("UPDATE orders SET status = ? WHERE workspace_id = ? AND external_order_id = ?")
      .bind(status, DEFAULT_WORKSPACE_ID, externalOrderId),
    db
      .prepare("UPDATE external_order_references SET status = ? WHERE workspace_id = ? AND external_order_id = ?")
      .bind(status, DEFAULT_WORKSPACE_ID, externalOrderId)
  ]);
  return { updated: Number(orderResult.meta.changes || referenceResult.meta.changes || 0) };
}

export function getFacebookOrderStatusForTests(externalOrderId: string) {
  return memoryOrderStatuses.get(externalOrderId) ?? null;
}
