import { NextResponse } from "next/server";
import { fail } from "@/lib/api-response";
import { assertFacebookReady, getFacebookRuntimeConfig } from "@/lib/facebook/env";
import { createOAuthState, buildFacebookOAuthUrl } from "@/lib/facebook/oauth";
import { DEFAULT_WORKSPACE_ID } from "@/lib/facebook/types";

export async function GET(request: Request) {
  const config = getFacebookRuntimeConfig();
  const state = createOAuthState(DEFAULT_WORKSPACE_ID);

  if (config.mode === "mock") {
    const callback = new URL("/api/facebook/callback", request.url);
    callback.searchParams.set("code", "mock_code");
    callback.searchParams.set("state", state);
    return NextResponse.redirect(callback);
  }

  const readiness = assertFacebookReady(config);
  if (!readiness.ok) return fail(readiness.error, 400, "BLOCKED_BY_MISSING_SECRET");

  // NEO: OAuth thật chỉ chạy khi đủ Meta env, không tự bịa token production.
  return NextResponse.redirect(buildFacebookOAuthUrl(config, state));
}
