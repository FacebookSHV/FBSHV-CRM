import { z } from "zod";
import { fail, failFromError, ok } from "@/lib/api-response";
import { sendMetaConversionEvent } from "@/lib/meta/conversions";

const conversionEventSchema = z.object({
  eventName: z.string().trim().min(1).max(80),
  eventId: z.string().trim().min(1).max(120).optional(),
  eventSourceUrl: z.string().trim().url().max(500).optional(),
  email: z.string().trim().email().max(320).optional(),
  phone: z.string().trim().min(6).max(40).optional(),
  value: z.coerce.number().nonnegative().optional(),
  currency: z.string().trim().min(3).max(3).optional(),
  contentName: z.string().trim().max(200).optional(),
  contentIds: z.array(z.string().trim().min(1).max(120)).max(50).optional()
});

export async function POST(request: Request) {
  const parsed = conversionEventSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return fail("Dữ liệu sự kiện CAPI không hợp lệ.", 400, "INVALID_CAPI_EVENT");
  try {
    return ok(await sendMetaConversionEvent(parsed.data));
  } catch (error) {
    return failFromError(error);
  }
}
