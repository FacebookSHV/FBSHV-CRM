import { ok } from "@/lib/api-response";
import { buildCalendarSuggestions } from "@/lib/content-planner";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const days = Math.min(30, Math.max(1, Number(url.searchParams.get("days") ?? 7)));
  return ok({ suggestions: buildCalendarSuggestions(days) });
}
