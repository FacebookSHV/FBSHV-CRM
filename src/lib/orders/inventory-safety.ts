import type { ApiResult, InventoryReservation } from "@/lib/ecommerce/types";

export function canApplyLocalInventoryMutation(
  externalResult: ApiResult<InventoryReservation>
) {
  return externalResult.success && externalResult.data.status === "reserved";
}
