import { fail, failFromError, ok } from "@/lib/api-response";
import { subscribeFacebookPage } from "@/lib/facebook/operations";
import { facebookPageParamSchema } from "@/lib/facebook/validation";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const parsed = facebookPageParamSchema.safeParse(await context.params);
  if (!parsed.success) return fail("Mã fanpage không hợp lệ.");

  let result;
  try {
    result = await subscribeFacebookPage(parsed.data.id);
  } catch (error) {
    return failFromError(error);
  }
  return result.success ? ok(result.data) : fail(result.error, 400, "FACEBOOK_SUBSCRIBE_FAILED");
}
