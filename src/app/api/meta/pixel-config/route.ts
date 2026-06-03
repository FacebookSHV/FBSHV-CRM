import { ok } from "@/lib/api-response";
import { getPublicPixelConfig } from "@/lib/meta/conversions";

export async function GET() {
  return ok(await getPublicPixelConfig());
}
