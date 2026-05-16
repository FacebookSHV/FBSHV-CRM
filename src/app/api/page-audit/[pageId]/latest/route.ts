import { fail, failFromError, ok } from "@/lib/api-response";
import { getLatestPageAudit } from "@/lib/page-audit";

export async function GET(
  _request: Request,
  context: { params: Promise<{ pageId: string }> }
) {
  const { pageId } = await context.params;
  try {
    const audit = await getLatestPageAudit(pageId);
    if (!audit) return fail("Chưa có audit cho Page này.", 404, "PAGE_AUDIT_NOT_FOUND");
    return ok({ audit });
  } catch (error) {
    return failFromError(error);
  }
}
