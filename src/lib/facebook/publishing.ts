import { getFacebookRuntimeConfigAsync } from "./env";
import { blockedMetaPermission, withMetaPermission } from "./permissions";
import { getFacebookStore } from "./store";
import { decryptToken } from "./token-crypto";

type PublishInput = {
  pageId: string;
  message: string;
  link?: string;
};

function graphUrl(version: string, path: string) {
  return `https://graph.facebook.com/${version}${path}`;
}

async function getPageToken(pageId: string) {
  const config = await getFacebookRuntimeConfigAsync();
  if (process.env.AUTO_PUBLISH_POSTS_ENABLED !== "true") {
    throw new Error("AUTO_PUBLISH_POSTS_DISABLED");
  }

  const page = await (await getFacebookStore()).getPage(pageId);
  if (!page || !page.pageAccessTokenEncrypted || page.tokenStatus !== "valid") {
    throw blockedMetaPermission("pages_manage_posts");
  }
  if (!config.encryptionKey) throw new Error("BLOCKED_BY_MISSING_SECRET: ENCRYPTION_KEY");
  return {
    token: await decryptToken(page.pageAccessTokenEncrypted, config.encryptionKey),
    externalPageId: page.externalPageId,
    graphApiVersion: config.graphApiVersion
  };
}

async function postToGraph(input: PublishInput, path: "feed" | "photos" | "videos") {
  const page = await getPageToken(input.pageId);
  return withMetaPermission("pages_manage_posts", async () => {
    const url = new URL(graphUrl(page.graphApiVersion, `/${encodeURIComponent(page.externalPageId)}/${path}`));
    url.searchParams.set("access_token", page.token);
    const response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(
        path === "feed"
          ? { message: input.message, link: input.link }
          : path === "photos"
            ? { caption: input.message, url: input.link }
            : { description: input.message, file_url: input.link }
      )
    });
    const payload = (await response.json().catch(() => ({}))) as { id?: string; post_id?: string; error?: { message?: string } };
    if (!response.ok || payload.error) throw new Error(payload.error?.message || "Meta publish lỗi.");
    return { externalPostId: payload.post_id || payload.id || "" };
  });
}

export function schedulePagePost(input: PublishInput & { scheduledAt: string }) {
  return {
    ...input,
    status: "scheduled" as const
  };
}

export function createPagePost(input: PublishInput) {
  return postToGraph(input, "feed");
}

export function publishPhotoPost(input: PublishInput) {
  return postToGraph(input, "photos");
}

export function publishVideoPost(input: PublishInput) {
  return postToGraph(input, "videos");
}
