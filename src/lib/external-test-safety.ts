export function getProductionWriteTestDecision(
  env: Record<string, string | undefined> = process.env
) {
  const reasons: string[] = [];
  if (env.MOCK_ECOMMERCE_API !== "false") reasons.push("MOCK_ECOMMERCE_API chưa tắt");
  if (!env.ECOMMERCE_API_KEY || env.ECOMMERCE_API_KEY.includes("replace_")) reasons.push("thiếu ECOMMERCE_API_KEY thật");
  if (!env.ECOMMERCE_WEBHOOK_SECRET || env.ECOMMERCE_WEBHOOK_SECRET.includes("replace_")) {
    reasons.push("thiếu ECOMMERCE_WEBHOOK_SECRET thật");
  }
  if (!env.SKU_TEST) reasons.push("thiếu SKU_TEST riêng");
  if (env.RUN_EXTERNAL_WRITE_TESTS !== "true") reasons.push("RUN_EXTERNAL_WRITE_TESTS chưa bật");

  return {
    shouldRun: reasons.length === 0,
    reasons
  };
}
