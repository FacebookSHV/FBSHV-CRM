import { fail, failFromError, ok } from "@/lib/api-response";
import { runDailyFacebookContentAutomation } from "@/lib/content-auto-planner";
import { getContentAutomationStatus } from "@/lib/content-runtime";
import { isSameOriginMutation } from "@/lib/request-security";

const CONFIRMATION = "CREATE_TODAY_SCHEDULE";

export async function POST(request: Request) {
  if (!isSameOriginMutation(request)) {
    return fail("Yêu cầu thao tác không hợp lệ.", 403, "SAME_ORIGIN_REQUIRED");
  }

  const status = await getContentAutomationStatus();
  if (!status.operatorRunEnabled) {
    return fail("Chưa bật quyền tạo lịch tự động từ giao diện.", 403, "CONTENT_AUTOMATION_UI_DISABLED");
  }

  const body = (await request.json().catch(() => ({}))) as {
    confirmation?: string;
    date?: string;
    limit?: number;
  };
  if (body.confirmation !== CONFIRMATION) {
    return fail("Cần xác nhận trước khi tạo lịch tự động.", 400, "CONTENT_AUTOMATION_CONFIRMATION_REQUIRED");
  }

  try {
    return ok(
      await runDailyFacebookContentAutomation({
        date: body.date,
        limit: body.limit,
        dryRun: false
      })
    );
  } catch (error) {
    return failFromError(error);
  }
}
