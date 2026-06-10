import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getD1Database } from "@/lib/db";
import { DEFAULT_WORKSPACE_ID } from "@/lib/facebook/types";

export type ContentMediaRecord = {
  id: string;
  postId: string;
  mediaType: "image" | "video";
  mimeType: string;
  fileName: string;
  fileSize: number;
  r2Key?: string | null;
  publicUrl?: string | null;
  status: "uploaded" | "failed" | "needs_review" | "approved" | "rejected";
  error?: string | null;
  createdAt: string;
};

const allowedImageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const allowedVideoTypes = new Set(["video/mp4", "video/quicktime"]);

function nowIso() {
  return new Date().toISOString();
}

function extensionFor(fileName: string, mimeType: string) {
  const ext = fileName.split(".").pop()?.toLowerCase();
  if (ext && /^[a-z0-9]+$/.test(ext)) return ext;
  if (mimeType === "image/jpeg") return "jpg";
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/webp") return "webp";
  if (mimeType === "video/mp4") return "mp4";
  return "bin";
}

function validateFile(file: File) {
  const mediaType: "image" | "video" | null = allowedImageTypes.has(file.type)
    ? "image"
    : allowedVideoTypes.has(file.type)
      ? "video"
      : null;
  if (!mediaType) return { ok: false as const, error: "MEDIA_TYPE_NOT_ALLOWED" };
  const maxBytes = mediaType === "image" ? 10 * 1024 * 1024 : 200 * 1024 * 1024;
  if (file.size > maxBytes) return { ok: false as const, error: "MEDIA_FILE_TOO_LARGE" };
  return { ok: true as const, mediaType };
}

async function getBucket() {
  try {
    const context = await getCloudflareContext({ async: true });
    return (context.env as { BUCKET?: R2Bucket }).BUCKET;
  } catch {
    return undefined;
  }
}

async function saveMediaRow(record: ContentMediaRecord) {
  const db = await getD1Database();
  if (!db) return;
  await db
    .prepare(
      `insert into content_media
      (id, workspace_id, post_id, media_type, mime_type, file_name, file_size, r2_key, public_url, status, error, created_at)
      values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      record.id,
      DEFAULT_WORKSPACE_ID,
      record.postId,
      record.mediaType,
      record.mimeType,
      record.fileName,
      record.fileSize,
      record.r2Key ?? null,
      record.publicUrl ?? null,
      record.status,
      record.error ?? null,
      record.createdAt
    )
    .run();
}

export async function uploadContentMedia(postId: string, file: File): Promise<ContentMediaRecord> {
  const validation = validateFile(file);
  if (!validation.ok) throw new Error(validation.error);

  const bucket = await getBucket();
  if (!bucket) throw new Error("R2_BUCKET_NOT_CONFIGURED");

  const id = crypto.randomUUID();
  const key = `content/${postId}/${id}.${extensionFor(file.name, file.type)}`;
  const bytes = await file.arrayBuffer();

  // NEO: Media bài đăng lưu trong R2 của CRM, không nhúng file vào DB.
  await bucket.put(key, bytes, {
    httpMetadata: { contentType: file.type },
    customMetadata: { postId, originalName: file.name }
  });

  const record: ContentMediaRecord = {
    id,
    postId,
    mediaType: validation.mediaType,
    mimeType: file.type,
    fileName: file.name,
    fileSize: file.size,
    r2Key: key,
    publicUrl: null,
    status: "uploaded",
    createdAt: nowIso()
  };
  await saveMediaRow(record);
  return record;
}

export async function listContentMedia(postId: string) {
  const db = await getD1Database();
  if (!db) return [] as ContentMediaRecord[];
  const rows = await db
    .prepare(
      `select id, post_id, media_type, mime_type, file_name, file_size, r2_key, public_url, status, error, created_at
       from content_media
       where post_id = ?
       order by created_at asc`
    )
    .bind(postId)
    .all<{
      id: string;
      post_id: string;
      media_type: "image" | "video";
      mime_type: string;
      file_name: string;
      file_size: number;
      r2_key: string | null;
      public_url: string | null;
      status: "uploaded" | "failed" | "needs_review" | "approved" | "rejected";
      error: string | null;
      created_at: string;
    }>();
  return (rows.results ?? []).map((row) => ({
    id: row.id,
    postId: row.post_id,
    mediaType: row.media_type,
    mimeType: row.mime_type,
    fileName: row.file_name,
    fileSize: row.file_size,
    r2Key: row.r2_key,
    publicUrl: row.public_url,
    status: row.status,
    error: row.error,
    createdAt: row.created_at
  }));
}

export async function deleteContentMediaForPost(postId: string) {
  const media = await listContentMedia(postId);
  const bucket = await getBucket();
  if (bucket) {
    await Promise.all(media.filter((item) => item.r2Key).map((item) => bucket.delete(item.r2Key!)));
  }

  const db = await getD1Database();
  if (!db) return { deleted: media.length };
  // NEO: Xóa draft/scheduled phải dọn cả metadata media để R2 không tích rác test.
  const result = await db.prepare("delete from content_media where post_id = ?").bind(postId).run();
  return { deleted: result.meta.changes ?? media.length };
}
