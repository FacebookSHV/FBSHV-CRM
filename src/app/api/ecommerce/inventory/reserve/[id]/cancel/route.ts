import { fail, fromResult } from "@/lib/api-response";
import { getEcommerceProviderAsync } from "@/lib/ecommerce/provider";
import { z } from "zod";

const paramsSchema = z.object({
  id: z.string().trim().min(1)
});

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const parsed = paramsSchema.safeParse(await context.params);
  if (!parsed.success) return fail("Mã giữ hàng không hợp lệ");
  return fromResult(await (await getEcommerceProviderAsync()).cancelReservation(parsed.data.id));
}
