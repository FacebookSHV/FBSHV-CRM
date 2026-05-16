export function formatMoney(value: number | null | undefined, currency = "VND") {
  const safeValue = Number.isFinite(Number(value)) ? Number(value) : 0;
  const safeCurrency = currency || "VND";
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: safeCurrency,
    maximumFractionDigits: 0
  }).format(safeValue);
}
