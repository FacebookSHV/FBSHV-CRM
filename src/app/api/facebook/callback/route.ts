import { NextResponse } from "next/server";
import { fail, failFromError } from "@/lib/api-response";
import { connectFacebookFromCode } from "@/lib/facebook/operations";
import { callbackTargetForOAuthState } from "@/lib/facebook/oauth";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state") ?? undefined;

  if (!code) return fail("Thiếu Facebook OAuth code.", 400);

  let result;
  try {
    result = await connectFacebookFromCode(code, state);
  } catch (error) {
    return failFromError(error);
  }
  if (!result.success) return fail(result.error, 400, "FACEBOOK_CONNECT_FAILED");

  const target = new URL(callbackTargetForOAuthState(state), request.url);
  target.searchParams.set("connected", "1");
  target.searchParams.set("mode", result.data.mode);
  target.searchParams.set("pages", String(result.data.pages));
  return NextResponse.redirect(target);
}
