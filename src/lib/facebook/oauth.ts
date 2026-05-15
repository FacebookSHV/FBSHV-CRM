import type { FacebookRuntimeConfig } from "./types";

export const FACEBOOK_OAUTH_SCOPES = [
  "pages_show_list",
  "pages_manage_metadata",
  "pages_messaging",
  "pages_read_engagement",
  "pages_manage_engagement",
  "business_management",
  "ads_read",
  "ads_management"
];

export function buildFacebookOAuthUrl(config: FacebookRuntimeConfig, state: string) {
  if (!config.appId) throw new Error("BLOCKED_BY_MISSING_SECRET: META_APP_ID");

  const url = new URL(`https://www.facebook.com/${config.graphApiVersion}/dialog/oauth`);
  url.searchParams.set("client_id", config.appId);
  url.searchParams.set("redirect_uri", config.redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("scope", FACEBOOK_OAUTH_SCOPES.join(","));
  url.searchParams.set("response_type", "code");
  return url;
}

export function createOAuthState(workspaceId: string) {
  return `workspace:${workspaceId}:${crypto.randomUUID()}`;
}
