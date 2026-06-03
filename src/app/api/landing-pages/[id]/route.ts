import { z } from "zod";
import { fail, failFromError, ok } from "@/lib/api-response";
import { updateLandingPageStatus } from "@/lib/landing-pages/store";
import type { LandingPageStatus } from "@/lib/landing-pages/types";

const updateSchema = z.object({
  status: z.enum(["draft", "published", "archived"])
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const parsed = updateSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return fail("Dữ liệu cập nhật landing page không hợp lệ.", 400, "INVALID_LANDING_PAGE_STATUS");
  try {
    return ok({ pages: await updateLandingPageStatus(id, parsed.data.status as LandingPageStatus) });
  } catch (error) {
    return failFromError(error);
  }
}
