import { getFacebookRuntimeConfigAsync } from "./env";
import { blockedMetaPermission, withMetaPermission } from "./permissions";
import { getFacebookStore } from "./store";
import { decryptToken } from "./token-crypto";
import { isAutoPublishRuntimeEnabled } from "@/lib/content-runtime";

type PublishInput = {
  pageId: string;
  message: string;
  link?: string;
};

type AlbumPublishInput = {
  pageId: string;
  message: string;
  mediaUrls: string[];
};

function graphUrl(version: string, path: string) {
  return `https://graph.facebook.com/${version}${path}`;
}

async function getPageToken(pageId: string) {
  const config = await getFacebookRuntimeConfigAsync();
  if (!(await isAutoPublishRuntimeEnabled())) {
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

async function graphPostJson<T>(url: URL, body: Record<string, unknown>): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
  const payload = (await response.json().catch(() => ({}))) as T & { error?: { message?: string } };
  if (!response.ok || payload.error) throw new Error(payload.error?.message || "Meta publish lỗi.");
  return payload;
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

export async function createAlbumPost(input: AlbumPublishInput) {
  const page = await getPageToken(input.pageId);
  const mediaUrls = [...new Set(input.mediaUrls.map((item) => item.trim()).filter(Boolean))].slice(0, 10);
  if (mediaUrls.length === 0) throw new Error("CONTENT_MEDIA_REQUIRED: Bài album cần ít nhất 1 ảnh.");

  return withMetaPermission("pages_manage_posts", async () => {
    const uploaded: string[] = [];
    for (const mediaUrl of mediaUrls) {
      const photoUrl = new URL(graphUrl(page.graphApiVersion, `/${encodeURIComponent(page.externalPageId)}/photos`));
      photoUrl.searchParams.set("access_token", page.token);
      const photo = await graphPostJson<{ id?: string }>(photoUrl, { url: mediaUrl, published: false });
      if (photo.id) uploaded.push(photo.id);
    }
    if (uploaded.length === 0) throw new Error("CONTENT_MEDIA_UPLOAD_FAILED: Meta không trả media_fbid cho album.");

    const feedUrl = new URL(graphUrl(page.graphApiVersion, `/${encodeURIComponent(page.externalPageId)}/feed`));
    feedUrl.searchParams.set("access_token", page.token);
    const post = await graphPostJson<{ id?: string }>(feedUrl, {
      message: input.message,
      attached_media: uploaded.map((mediaFbid) => ({ media_fbid: mediaFbid }))
    });
    return { externalPostId: post.id || uploaded[0] || "" };
  });
}

export async function deletePagePost(input: { pageId: string; externalPostId: string }) {
  const page = await getPageToken(input.pageId);
  return withMetaPermission("pages_manage_posts", async () => {
    const url = new URL(graphUrl(page.graphApiVersion, `/${encodeURIComponent(input.externalPostId)}`));
    url.searchParams.set("access_token", page.token);
    const response = await fetch(url, { method: "DELETE" });
    const payload = (await response.json().catch(() => ({}))) as { success?: boolean; error?: { message?: string } };
    if (!response.ok || payload.error || payload.success !== true) {
      throw new Error(payload.error?.message || "Meta delete post lỗi.");
    }
    return { deleted: true };
  });
}
