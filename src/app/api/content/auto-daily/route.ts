import { fail, failFromError, ok } from "@/lib/api-response";
import { runDailyFacebookContentAutomation } from "@/lib/content-auto-planner";
import { getContentAutomationToken } from "@/lib/content-runtime";

function bearerToken(request: Request) {
  const header = request.headers.get("authorization") || "";
  if (header.toLowerCase().startsWith("bearer ")) return header.slice(7).trim();
  return request.headers.get("x-content-automation-token")?.trim() || "";
}

async function requireAutomationToken(request: Request, dryRun: boolean) {
  const expected = await getContentAutomationToken();
  if (dryRun) return null;
  if (!expected) return "CONTENT_AUTOMATION_TOKEN_REQUIRED";
  return bearerToken(request) === expected ? null : "CONTENT_AUTOMATION_UNAUTHORIZED";
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { date?: string; limit?: number; dryRun?: boolean; pageIds?: string[] };
  const dryRun = body.dryRun === true;
  const authError = await requireAutomationToken(request, dryRun);
  if (authError) return fail(authError, 401, authError);

  try {
    return ok(
      await runDailyFacebookContentAutomation({
        date: body.date,
        limit: body.limit,
        pageIds: Array.isArray(body.pageIds) ? body.pageIds : undefined,
        dryRun
      })
    );
  } catch (error) {
    return failFromError(error);
  }
}
