import { z } from "zod";
import { fail, failFromError, ok } from "@/lib/api-response";
import { createLandingPage, listLandingPages, listLandingTemplates } from "@/lib/landing-pages/store";
import type { LandingTemplateId } from "@/lib/landing-pages/types";

const createLandingPageSchema = z.object({
  productSku: z.string().trim().min(1).max(120),
  templateId: z.enum(["sales_fast", "video_guide", "compare"]),
  title: z.string().trim().max(200).optional()
});

export async function GET() {
  return ok({ pages: await listLandingPages(), templates: listLandingTemplates() });
}

export async function POST(request: Request) {
  const parsed = createLandingPageSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return fail("Dữ liệu tạo landing page không hợp lệ.", 400, "INVALID_LANDING_PAGE");
  try {
    return ok(await createLandingPage({
      productSku: parsed.data.productSku,
      templateId: parsed.data.templateId as LandingTemplateId,
      title: parsed.data.title
    }));
  } catch (error) {
    return failFromError(error);
  }
}
