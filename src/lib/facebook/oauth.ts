import type { FacebookRuntimeConfig } from "./types";

export const FACEBOOK_OAUTH_SCOPES = [
  "pages_show_list",
  "pages_manage_metadata",
  "pages_read_engagement",
  "pages_messaging",
  "pages_manage_engagement",
  "pages_manage_posts"
];

export const FACEBOOK_ADS_OAUTH_SCOPES = [
  ...FACEBOOK_OAUTH_SCOPES,
  "business_management",
  "ads_read"
];

export function buildFacebookOAuthUrl(config: FacebookRuntimeConfig, state: string, scopes = FACEBOOK_OAUTH_SCOPES) {
  if (!config.appId) throw new Error("BLOCKED_BY_MISSING_SECRET: META_APP_ID");

  const url = new URL(`https://www.facebook.com/${config.graphApiVersion}/dialog/oauth`);
  url.searchParams.set("client_id", config.appId);
  url.searchParams.set("redirect_uri", config.redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("scope", scopes.join(","));
  url.searchParams.set("response_type", "code");
  return url;
}

export function createOAuthState(workspaceId: string, intent: "base" | "ads" = "base") {
  return `workspace:${workspaceId}:intent:${intent}:${crypto.randomUUID()}`;
}

export function intentFromOAuthState(state?: string) {
  return state?.includes(":intent:ads:") ? "ads" as const : "base" as const;
}

export function scopesForOAuthIntent(intent: "base" | "ads") {
  return intent === "ads" ? FACEBOOK_ADS_OAUTH_SCOPES : FACEBOOK_OAUTH_SCOPES;
}

export function callbackTargetForOAuthState(state?: string) {
  return intentFromOAuthState(state) === "ads" ? "/ads" : "/fanpages";
}
