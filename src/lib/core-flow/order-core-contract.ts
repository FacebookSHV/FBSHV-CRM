import { getEcommerceProviderAsync } from "@/lib/ecommerce/provider";
import type {
  ApiResult,
  EcommerceManagementProvider,
  ExternalOrder,
  FacebookOrderPayload
} from "@/lib/ecommerce/types";
import { writeCoreActionAuditLog } from "@/lib/integration/events-store";
import {
  persistFacebookOrderReadModel,
  type PersistFacebookOrderInput
} from "@/lib/orders/store";

export type FacebookOrderCreationResult = ExternalOrder & {
  localOrderId: string;
};

type OrderCoreDependencies = {
  provider?: EcommerceManagementProvider;
  persist?: (input: PersistFacebookOrderInput) => Promise<{ localOrderId: string; externalOrderId: string }>;
  audit?: typeof writeCoreActionAuditLog;
};

async function auditResult(
  audit: typeof writeCoreActionAuditLog,
  input: FacebookOrderPayload,
  idempotencyKey: string,
  resultStatus: "success" | "failed",
  responseJson?: Record<string, unknown>,
  errorMessage?: string
) {
  await audit({
    actorType: "operator",
    actorId: input.customerId,
    actionType: "create_facebook_order",
    sourceModule: "orders",
    targetSystem: "web-tmdt",
    idempotencyKey,
    requestJson: {
      sku: input.sku,
      quantity: input.quantity,
      conversationId: input.conversationId ?? null
    },
    responseJson,
    resultStatus,
    errorMessage
  });
}

export async function createFacebookOrderThroughCore(
  input: FacebookOrderPayload,
  dependencies: OrderCoreDependencies = {}
): Promise<ApiResult<FacebookOrderCreationResult>> {
  const provider = dependencies.provider ?? (await getEcommerceProviderAsync());
  const persist = dependencies.persist ?? persistFacebookOrderReadModel;
  const audit = dependencies.audit ?? writeCoreActionAuditLog;
  const idempotencyKey =
    input.sourceOrderId || `fbcrm:${input.conversationId ?? input.customerId}:${input.sku}`;

  const price = await provider.getSkuPrice(input.sku);
  if (!price.success) {
    await auditResult(audit, input, idempotencyKey, "failed", undefined, price.error);
    return price;
  }

  const inventory = await provider.checkInventory(input.sku, input.quantity);
  if (!inventory.success) {
    await auditResult(audit, input, idempotencyKey, "failed", undefined, inventory.error);
    return inventory;
  }
  if (!inventory.data.enoughStock) {
    const error = "Tồn kho realtime không đủ để tạo đơn.";
    await auditResult(audit, input, idempotencyKey, "failed", { availableStock: inventory.data.availableStock }, error);
    return { success: false, error, code: "INSUFFICIENT_STOCK" };
  }

  const reservation = await provider.reserveInventory(input.sku, input.quantity, {
    idempotencyKey,
    source: "facebook_crm",
    sourceConversationId: input.conversationId,
    sourceCustomerId: input.customerId
  });
  if (!reservation.success) {
    await auditResult(audit, input, idempotencyKey, "failed", undefined, reservation.error);
    return reservation;
  }

  const external = await provider.createOrderFromFacebook({
    ...input,
    currentPrice: price.data.price,
    currency: price.data.currency,
    reservationId: reservation.data.reservationId,
    sourceOrderId: idempotencyKey
  });
  if (!external.success) {
    await provider.cancelReservation(reservation.data.reservationId).catch(() => null);
    await auditResult(audit, input, idempotencyKey, "failed", undefined, external.error);
    return external;
  }

  // NEO: Chỉ ghi read-model CRM sau khi Order Core xác nhận tạo đơn thành công.
  const local = await persist({
    payload: input,
    externalOrder: external.data,
    reservation: reservation.data,
    unitPrice: price.data.price,
    currency: price.data.currency
  });
  await auditResult(audit, input, idempotencyKey, "success", {
    externalOrderId: external.data.externalOrderId,
    localOrderId: local.localOrderId
  });

  return {
    success: true,
    data: {
      ...external.data,
      localOrderId: local.localOrderId
    }
  };
}
