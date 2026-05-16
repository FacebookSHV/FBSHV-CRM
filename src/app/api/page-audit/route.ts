import { failFromError, ok } from "@/lib/api-response";
import { listPageAudits, runPageAudit } from "@/lib/page-audit";

export async function GET() {
  try {
    return ok({ audits: await listPageAudits() });
  } catch (error) {
    return failFromError(error);
  }
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { pageId?: string };
  try {
    return ok({ runs: await runPageAudit(body.pageId) });
  } catch (error) {
    return failFromError(error);
  }
}
