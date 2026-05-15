import type { FacebookPageFromGraph, FacebookRuntimeConfig, FacebookSendResult } from "./types";

type GraphTokenResponse = {
  access_token?: string;
  expires_in?: number;
  error?: { message?: string };
};

type GraphPageResponse = {
  data?: Array<{
    id?: string;
    name?: string;
    access_token?: string;
    picture?: { data?: { url?: string } };
  }>;
  error?: { message?: string };
};

type GraphIdResponse = {
  id?: string;
  message_id?: string;
  error?: { message?: string };
};

export type FacebookUserTokenResult = {
  accessToken: string;
  expiresAt?: string;
};

export interface FacebookClient {
  exchangeCodeForUserToken(code: string): Promise<FacebookUserTokenResult>;
  listPages(userAccessToken: string): Promise<FacebookPageFromGraph[]>;
  subscribePage(pageExternalId: string, pageAccessToken: string): Promise<FacebookSendResult>;
  sendMessage(pageExternalId: string, pageAccessToken: string, recipientId: string, message: string): Promise<FacebookSendResult>;
  replyComment(pageAccessToken: string, commentExternalId: string, message: string): Promise<FacebookSendResult>;
  setCommentHidden(pageAccessToken: string, commentExternalId: string, hidden: boolean): Promise<FacebookSendResult>;
}

function graphUrl(config: FacebookRuntimeConfig, path: string) {
  return `https://graph.facebook.com/${config.graphApiVersion}${path}`;
}

async function readGraphJson<T>(response: Response): Promise<T> {
  const payload = (await response.json().catch(() => ({}))) as T & { error?: { message?: string } };
  if (!response.ok || payload.error) {
    throw new Error(payload.error?.message || "Meta Graph API trả lỗi.");
  }
  return payload;
}

export class MetaGraphFacebookClient implements FacebookClient {
  constructor(private readonly config: FacebookRuntimeConfig) {}

  async exchangeCodeForUserToken(code: string) {
    if (!this.config.appId || !this.config.appSecret) {
      throw new Error("BLOCKED_BY_MISSING_SECRET: META_APP_ID, META_APP_SECRET");
    }

    const url = new URL(graphUrl(this.config, "/oauth/access_token"));
    url.searchParams.set("client_id", this.config.appId);
    url.searchParams.set("client_secret", this.config.appSecret);
    url.searchParams.set("redirect_uri", this.config.redirectUri);
    url.searchParams.set("code", code);

    const payload = await readGraphJson<GraphTokenResponse>(await fetch(url));
    if (!payload.access_token) throw new Error("Meta không trả user access token.");

    return {
      accessToken: payload.access_token,
      expiresAt: payload.expires_in ? new Date(Date.now() + payload.expires_in * 1000).toISOString() : undefined
    };
  }

  async listPages(userAccessToken: string) {
    const url = new URL(graphUrl(this.config, "/me/accounts"));
    url.searchParams.set("fields", "id,name,access_token,picture{url}");
    url.searchParams.set("access_token", userAccessToken);

    const payload = await readGraphJson<GraphPageResponse>(await fetch(url));
    return (payload.data ?? [])
      .filter((page) => page.id && page.name && page.access_token)
      .map((page) => ({
        id: page.id!,
        name: page.name!,
        accessToken: page.access_token!,
        pictureUrl: page.picture?.data?.url
      }));
  }

  async subscribePage(pageExternalId: string, pageAccessToken: string) {
    const url = new URL(graphUrl(this.config, `/${encodeURIComponent(pageExternalId)}/subscribed_apps`));
    url.searchParams.set("access_token", pageAccessToken);
    const response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        subscribed_fields: ["messages", "messaging_postbacks", "feed"].join(",")
      })
    });
    await readGraphJson<Record<string, unknown>>(response);
    return { externalId: `sub_${pageExternalId}`, mock: false };
  }

  async sendMessage(pageExternalId: string, pageAccessToken: string, recipientId: string, message: string) {
    const url = new URL(graphUrl(this.config, `/${encodeURIComponent(pageExternalId)}/messages`));
    url.searchParams.set("access_token", pageAccessToken);
    const response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ recipient: { id: recipientId }, message: { text: message } })
    });
    const payload = await readGraphJson<GraphIdResponse>(response);
    return { externalId: payload.message_id || payload.id || `sent_${Date.now()}`, mock: false };
  }

  async replyComment(pageAccessToken: string, commentExternalId: string, message: string) {
    const url = new URL(graphUrl(this.config, `/${encodeURIComponent(commentExternalId)}/comments`));
    url.searchParams.set("access_token", pageAccessToken);
    const response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message })
    });
    const payload = await readGraphJson<GraphIdResponse>(response);
    return { externalId: payload.id || `comment_reply_${Date.now()}`, mock: false };
  }

  async setCommentHidden(pageAccessToken: string, commentExternalId: string, hidden: boolean) {
    const url = new URL(graphUrl(this.config, `/${encodeURIComponent(commentExternalId)}`));
    url.searchParams.set("access_token", pageAccessToken);
    const response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ is_hidden: hidden })
    });
    await readGraphJson<Record<string, unknown>>(response);
    return { externalId: `comment_hidden_${commentExternalId}`, mock: false };
  }
}

export class MockFacebookClient implements FacebookClient {
  async exchangeCodeForUserToken() {
    return {
      accessToken: "mock-user-token",
      expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString()
    };
  }

  async listPages() {
    return [
      {
        id: "page_mock_shop_huy_van",
        name: "Shop Huy Vân",
        accessToken: "mock-page-token",
        pictureUrl: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d"
      },
      {
        id: "page_mock_thiet_bi",
        name: "Thiết bị nhà thông minh",
        accessToken: "mock-page-token-2",
        pictureUrl: "https://images.unsplash.com/photo-1558002038-1055907df827"
      }
    ];
  }

  async subscribePage(pageExternalId: string) {
    return { externalId: `mock_sub_${pageExternalId}`, mock: true };
  }

  async sendMessage(_pageExternalId: string, _pageAccessToken: string, recipientId: string) {
    return { externalId: `mock_msg_${recipientId}_${Date.now()}`, mock: true };
  }

  async replyComment(_pageAccessToken: string, commentExternalId: string) {
    return { externalId: `mock_reply_${commentExternalId}_${Date.now()}`, mock: true };
  }

  async setCommentHidden(_pageAccessToken: string, commentExternalId: string, hidden: boolean) {
    return { externalId: `mock_hide_${commentExternalId}_${hidden ? "1" : "0"}`, mock: true };
  }
}

export function createFacebookClient(config: FacebookRuntimeConfig): FacebookClient {
  return config.mode === "mock" ? new MockFacebookClient() : new MetaGraphFacebookClient(config);
}
