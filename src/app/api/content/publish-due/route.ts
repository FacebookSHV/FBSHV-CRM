import { fail, failFromError, ok } from "@/lib/api-response";
import { publishDueContentJobs } from "@/lib/content-publishing";
import { getContentAutomationToken } from "@/lib/content-runtime";

function bearerToken(request: Request) {
  const header = request.headers.get("authorization") || "";
  if (header.toLowerCase().startsWith("bearer ")) return header.slice(7).trim();
  return request.headers.get("x-content-automation-token")?.trim() || "";
}

async function requireAutomationToken(request: Request) {
  const expected = await getContentAutomationToken();
  if (!expected) return "CONTENT_AUTOMATION_TOKEN_REQUIRED";
  return bearerToken(request) === expected ? null : "CONTENT_AUTOMATION_UNAUTHORIZED";
}

export async function POST(request: Request) {
  const authError = await requireAutomationToken(request);
  if (authError) return fail(authError, 401, authError);
  const body = (await request.json().catch(() => ({}))) as { now?: string; limit?: number };
  try {
    return ok(await publishDueContentJobs({ now: body.now, limit: body.limit }));
  } catch (error) {
    return failFromError(error);
  }
}
