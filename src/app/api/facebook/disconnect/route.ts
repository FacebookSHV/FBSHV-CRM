import { fail, failFromError, ok } from "@/lib/api-response";
import { disconnectFacebook } from "@/lib/facebook/operations";
import { disconnectSchema } from "@/lib/facebook/validation";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const parsed = disconnectSchema.safeParse(body);
  if (!parsed.success) return fail("Dữ liệu ngắt kết nối không hợp lệ.");

  try {
    return ok((await disconnectFacebook(parsed.data.pageId)).data);
  } catch (error) {
    return failFromError(error);
  }
}
