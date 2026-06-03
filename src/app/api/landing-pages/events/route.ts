import { z } from "zod";
import { fail, failFromError, ok } from "@/lib/api-response";
import { recordLandingPageEvent } from "@/lib/landing-pages/store";

const eventSchema = z.object({
  landingPageId: z.string().trim().min(1).max(120),
  variantId: z.string().trim().max(120).optional(),
  eventName: z.enum(["PageView", "Lead", "Contact", "ViewContent"]),
  eventId: z.string().trim().min(1).max(160).optional(),
  visitorId: z.string().trim().max(160).optional(),
  sourceUrl: z.string().trim().url().max(500).optional(),
  email: z.string().trim().email().max(320).optional(),
  phone: z.string().trim().min(6).max(40).optional(),
  name: z.string().trim().max(120).optional(),
  value: z.coerce.number().nonnegative().optional(),
  currency: z.string().trim().min(3).max(3).optional(),
  contentName: z.string().trim().max(200).optional(),
  contentIds: z.array(z.string().trim().min(1).max(120)).max(20).optional()
});

export async function POST(request: Request) {
  const parsed = eventSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return fail("Dữ liệu landing event không hợp lệ.", 400, "INVALID_LANDING_EVENT");
  try {
    return ok(await recordLandingPageEvent(parsed.data));
  } catch (error) {
    return failFromError(error);
  }
}
