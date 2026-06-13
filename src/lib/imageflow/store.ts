import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getD1Database } from "@/lib/db";
import { normalizeProductForCache, readCachedProductBySku } from "@/lib/ecommerce/cache";
import { getEcommerceProviderAsync } from "@/lib/ecommerce/provider";
import type { ProductWithInventory } from "@/lib/ecommerce/types";
import { DEFAULT_WORKSPACE_ID } from "@/lib/facebook/types";
import type {
  CreateImageflowJobInput,
  ImageflowAsset,
  ImageflowAssetStatus,
  ImageflowJob,
  ImageflowJobPatch,
  ImageflowJobStatus,
  UploadedImageflowAssetInput
} from "./types";

const memoryJobs = new Map<string, ImageflowJob>();
const memoryAssets = new Map<string, ImageflowAsset>();

type ImageflowJobRow = {
  id: string;
  workspace_id: string;
  post_id: string | null;
  product_sku: string;
  title: string;
  status: ImageflowJobStatus;
  target_format: string;
  target_aspect_ratio: string;
  output_width: number;
  output_height: number;
  requested_count: number;
  prompt_json: string;
  product_context_json: string;
  result_manifest_json: string;
  error: string | null;
  locked_by: string | null;
  locked_until: string | null;
  created_at: string;
  updated_at: string;
  started_at: string | null;
  finished_at: string | null;
};

type ImageflowAssetRow = {
  id: string;
  workspace_id: string;
  job_id: string;
  post_id: string | null;
  media_id: string | null;
  asset_index: number;
  role: string;
  status: string;
  file_name: string;
  mime_type: string;
  file_size: number;
  r2_key: string | null;
  public_url: string | null;
  prompt_json: string;
  created_at: string;
};

function nowIso() {
  return new Date().toISOString();
}

function appBaseUrl() {
  return process.env.CRM_APP_URL || process.env.NEXT_PUBLIC_APP_URL || "https://fbshv-crm.ngchihuy.workers.dev";
}

function safeJson(value: unknown) {
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value ?? {});
  } catch {
    return "{}";
  }
}

function safeNumber(value: unknown, fallback: number, min: number, max: number) {
  const number = Number(value ?? fallback);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(min, Math.min(max, Math.floor(number)));
}

function uniqueStrings(values: Array<string | null | undefined>) {
  return [...new Set(values.map((value) => String(value ?? "").trim()).filter(Boolean))];
}

function mergePromptAssets(...assets: Array<ProductWithInventory["promptAssets"] | undefined>) {
  const merged: NonNullable<ProductWithInventory["promptAssets"]> = {};
  for (const item of assets) {
    if (!item) continue;
    Object.assign(merged, item);
  }
  const allImageUrls = uniqueStrings(assets.flatMap((item) => item?.allImageUrls ?? []));
  if (allImageUrls.length > 0) merged.allImageUrls = allImageUrls;
  return Object.keys(merged).length > 0 ? merged : undefined;
}

function mergeProductDetails(primary: ProductWithInventory, detail?: ProductWithInventory | null): ProductWithInventory {
  if (!detail) return primary;
  const images = uniqueStrings([primary.imageUrl, detail.imageUrl, ...(primary.images ?? []), ...(detail.images ?? [])]);
  const variants = (detail.variants?.length ?? 0) > (primary.variants?.length ?? 0) ? detail.variants : primary.variants;
  return {
    ...primary,
    ...detail,
    imageUrl: detail.imageUrl || primary.imageUrl || images[0] || "",
    images,
    description: detail.description || primary.description,
    promptAssets: mergePromptAssets(primary.promptAssets, detail.promptAssets),
    variants,
    rawPayload: detail.rawPayload || primary.rawPayload
  };
}

function statusOrDefault(value: unknown): ImageflowJobStatus {
  const statuses = new Set<ImageflowJobStatus>(["queued", "running", "needs_user", "completed", "failed", "cancelled"]);
  return statuses.has(value as ImageflowJobStatus) ? (value as ImageflowJobStatus) : "queued";
}

function assetStatusOrDefault(value: unknown): ImageflowAssetStatus {
  const statuses = new Set<ImageflowAssetStatus>(["uploaded", "needs_review", "approved", "rejected"]);
  return statuses.has(value as ImageflowAssetStatus) ? (value as ImageflowAssetStatus) : "uploaded";
}

function extensionFor(fileName: string, mimeType: string) {
  const ext = fileName.split(".").pop()?.toLowerCase();
  if (ext && /^[a-z0-9]+$/.test(ext)) return ext;
  if (mimeType === "image/jpeg") return "jpg";
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/webp") return "webp";
  return "bin";
}

function validateImageFile(file: File) {
  const allowed = new Set(["image/jpeg", "image/png", "image/webp"]);
  if (!allowed.has(file.type)) throw new Error("IMAGEFLOW_ASSET_TYPE_NOT_ALLOWED: Chỉ nhận JPG, PNG hoặc WebP.");
  if (file.size > 12 * 1024 * 1024) throw new Error("IMAGEFLOW_ASSET_TOO_LARGE: Ảnh vượt quá 12MB.");
}

async function getBucket() {
  try {
    const context = await getCloudflareContext({ async: true });
    return (context.env as { BUCKET?: R2Bucket }).BUCKET;
  } catch {
    return undefined;
  }
}

function compactProductContext(product: ProductWithInventory) {
  return {
    sku: product.sku,
    name: product.name,
    category: product.category,
    price: product.currentPrice,
    originalPrice: product.originalPrice,
    currency: product.currency,
    stock: product.availableStock,
    imageUrl: product.imageUrl,
    images: product.images,
    description: product.description,
    promptAssets: product.promptAssets,
    variants: product.variants,
    rawPayload: product.rawPayload
  };
}

async function readProductPromptContextBySku(sku: string) {
  const cached = await readCachedProductBySku(sku);
  if (!cached) return null;

  const provider = await getEcommerceProviderAsync();
  const skuDetail = await provider.getProductBySku(sku);
  if (!skuDetail.success) {
    throw new Error(`IMAGEFLOW_PRODUCT_DETAIL_FAILED: ${skuDetail.error}`);
  }
  const idDetail = await provider.getProductById(sku).catch(() => null);
  const mergedDetail = mergeProductDetails(skuDetail.data, idDetail?.success ? idDetail.data : null);

  // NEO: Product Core detail must keep all images, promptAssets and variants before ImageFlow writes a local product_package.
  return normalizeProductForCache(
    {
      ...mergedDetail,
      workspaceId: cached.workspaceId,
      stock: mergedDetail.stock ?? cached.stock,
      availableStock: mergedDetail.availableStock ?? cached.availableStock,
      reservedStock: mergedDetail.reservedStock ?? cached.reservedStock,
      lowStockThreshold: mergedDetail.lowStockThreshold ?? cached.lowStockThreshold
    },
    nowIso()
  );
}
function mapJob(row: ImageflowJobRow): ImageflowJob {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    postId: row.post_id,
    productSku: row.product_sku,
    title: row.title,
    status: statusOrDefault(row.status),
    targetFormat: row.target_format,
    targetAspectRatio: row.target_aspect_ratio,
    outputWidth: row.output_width,
    outputHeight: row.output_height,
    requestedCount: row.requested_count,
    promptJson: row.prompt_json,
    productContextJson: row.product_context_json,
    resultManifestJson: row.result_manifest_json,
    error: row.error,
    lockedBy: row.locked_by,
    lockedUntil: row.locked_until,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    startedAt: row.started_at,
    finishedAt: row.finished_at
  };
}

function mapAsset(row: ImageflowAssetRow): ImageflowAsset {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    jobId: row.job_id,
    postId: row.post_id,
    mediaId: row.media_id,
    assetIndex: row.asset_index,
    role: row.role,
    status: assetStatusOrDefault(row.status),
    fileName: row.file_name,
    mimeType: row.mime_type,
    fileSize: row.file_size,
    r2Key: row.r2_key,
    publicUrl: row.public_url,
    promptJson: row.prompt_json,
    createdAt: row.created_at
  };
}

async function attachDetails(job: ImageflowJob) {
  const [product, assets] = await Promise.all([readCachedProductBySku(job.productSku), listImageflowAssets(job.id)]);
  return { ...job, product, assets };
}

export async function createImageflowJob(input: CreateImageflowJobInput) {
  const sku = input.productSku.trim();
  if (!sku) throw new Error("IMAGEFLOW_PRODUCT_REQUIRED: Cần chọn sản phẩm thật trước khi tạo job ảnh.");
  const product = await readProductPromptContextBySku(sku);
  if (!product) throw new Error("IMAGEFLOW_PRODUCT_NOT_FOUND: Chưa có sản phẩm trong cache, hãy đồng bộ sản phẩm trước.");

  const id = crypto.randomUUID();
  const createdAt = nowIso();
  const job: ImageflowJob = {
    id,
    workspaceId: DEFAULT_WORKSPACE_ID,
    postId: input.postId?.trim() || null,
    productSku: sku,
    title: input.title?.trim() || `Album ảnh ${product.name}`,
    status: "queued",
    targetFormat: input.targetFormat?.trim() || "facebook_album",
    targetAspectRatio: input.targetAspectRatio?.trim() || "4:5",
    outputWidth: safeNumber(input.outputWidth, 1080, 512, 4096),
    outputHeight: safeNumber(input.outputHeight, 1350, 512, 4096),
    requestedCount: safeNumber(input.requestedCount, 5, 1, 10),
    promptJson: safeJson(input.promptJson),
    productContextJson: safeJson(input.productContextJson ?? compactProductContext(product)),
    resultManifestJson: "{}",
    error: null,
    lockedBy: null,
    lockedUntil: null,
    createdAt,
    updatedAt: createdAt,
    startedAt: null,
    finishedAt: null,
    product,
    assets: []
  };

  const db = await getD1Database();
  if (!db) {
    memoryJobs.set(id, job);
    return job;
  }

  await db
    .prepare(
      `insert into imageflow_jobs
      (id, workspace_id, post_id, product_sku, title, status, target_format, target_aspect_ratio,
       output_width, output_height, requested_count, prompt_json, product_context_json, result_manifest_json,
       error, locked_by, locked_until, created_at, updated_at, started_at, finished_at)
       values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      job.id,
      job.workspaceId,
      job.postId,
      job.productSku,
      job.title,
      job.status,
      job.targetFormat,
      job.targetAspectRatio,
      job.outputWidth,
      job.outputHeight,
      job.requestedCount,
      job.promptJson,
      job.productContextJson,
      job.resultManifestJson,
      job.error,
      job.lockedBy,
      job.lockedUntil,
      job.createdAt,
      job.updatedAt,
      job.startedAt,
      job.finishedAt
    )
    .run();
  return job;
}

export async function listImageflowAssets(jobId: string) {
  const db = await getD1Database();
  if (!db) {
    return [...memoryAssets.values()].filter((asset) => asset.jobId === jobId).sort((a, b) => a.assetIndex - b.assetIndex);
  }
  const rows = await db
    .prepare(
      `select id, workspace_id, job_id, post_id, media_id, asset_index, role, status, file_name,
       mime_type, file_size, r2_key, public_url, prompt_json, created_at
       from imageflow_assets where job_id = ? order by asset_index asc, created_at asc`
    )
    .bind(jobId)
    .all<ImageflowAssetRow>();
  return (rows.results ?? []).map(mapAsset);
}

export async function listImageflowJobs(limit = 50) {
  const safeLimit = safeNumber(limit, 50, 1, 100);
  const db = await getD1Database();
  if (!db) {
    const jobs = [...memoryJobs.values()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, safeLimit);
    return Promise.all(jobs.map(attachDetails));
  }
  const rows = await db
    .prepare(
      `select id, workspace_id, post_id, product_sku, title, status, target_format, target_aspect_ratio,
       output_width, output_height, requested_count, prompt_json, product_context_json, result_manifest_json,
       error, locked_by, locked_until, created_at, updated_at, started_at, finished_at
       from imageflow_jobs where workspace_id = ? order by updated_at desc limit ?`
    )
    .bind(DEFAULT_WORKSPACE_ID, safeLimit)
    .all<ImageflowJobRow>();
  return Promise.all((rows.results ?? []).map((row) => attachDetails(mapJob(row))));
}

export async function getImageflowJob(id: string) {
  const db = await getD1Database();
  if (!db) {
    const job = memoryJobs.get(id);
    return job ? attachDetails(job) : null;
  }
  const row = await db
    .prepare(
      `select id, workspace_id, post_id, product_sku, title, status, target_format, target_aspect_ratio,
       output_width, output_height, requested_count, prompt_json, product_context_json, result_manifest_json,
       error, locked_by, locked_until, created_at, updated_at, started_at, finished_at
       from imageflow_jobs where id = ? and workspace_id = ? limit 1`
    )
    .bind(id, DEFAULT_WORKSPACE_ID)
    .first<ImageflowJobRow>();
  return row ? attachDetails(mapJob(row)) : null;
}

export async function getImageflowJobByPostId(postId: string) {
  const safePostId = postId.trim();
  if (!safePostId) return null;
  const db = await getD1Database();
  if (!db) {
    const job = [...memoryJobs.values()]
      .filter((item) => item.postId === safePostId)
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))[0];
    return job ? attachDetails(job) : null;
  }
  const row = await db
    .prepare(
      `select id, workspace_id, post_id, product_sku, title, status, target_format, target_aspect_ratio,
       output_width, output_height, requested_count, prompt_json, product_context_json, result_manifest_json,
       error, locked_by, locked_until, created_at, updated_at, started_at, finished_at
       from imageflow_jobs where post_id = ? and workspace_id = ? order by updated_at desc limit 1`
    )
    .bind(safePostId, DEFAULT_WORKSPACE_ID)
    .first<ImageflowJobRow>();
  return row ? attachDetails(mapJob(row)) : null;
}

export async function ensureImageflowJobForPost(input: CreateImageflowJobInput & { postId: string }) {
  const postId = input.postId.trim();
  if (!postId) throw new Error("IMAGEFLOW_POST_REQUIRED: Can co postId de tao anh tu dong.");
  const existing = await getImageflowJobByPostId(postId);
  if (!existing) return createImageflowJob({ ...input, postId });
  if (existing.status === "failed" || existing.status === "cancelled") {
    return updateImageflowJob(existing.id, { status: "queued", error: null });
  }
  return existing;
}

export async function claimNextImageflowJob(workerId: string) {
  const lockedBy = workerId.trim() || "local-imageflow";
  const db = await getD1Database();
  const startedAt = nowIso();
  const lockedUntil = new Date(Date.now() + 35 * 60 * 1000).toISOString();

  if (!db) {
    for (const [id, item] of memoryJobs.entries()) {
      if (item.status === "running" && item.lockedUntil && item.lockedUntil < startedAt) {
        memoryJobs.set(id, {
          ...item,
          status: "queued",
          lockedBy: null,
          lockedUntil: null,
          startedAt: null,
          updatedAt: startedAt
        });
      }
    }
    const job = [...memoryJobs.values()].find((item) => item.status === "queued");
    if (!job) return null;
    const claimed = { ...job, status: "running" as const, lockedBy, lockedUntil, startedAt, updatedAt: startedAt };
    memoryJobs.set(job.id, claimed);
    return attachDetails(claimed);
  }

  // NEO: Auto-recovery job stuck running — reset job hết lockedUntil về queued
  const nowForRecovery = nowIso();

  await db
    .prepare(
      `UPDATE imageflow_jobs
       SET status = 'queued',
           locked_by = NULL,
           locked_until = NULL,
           started_at = NULL,
           updated_at = ?
       WHERE workspace_id = ?
         AND status = 'running'
         AND locked_until < ?`
    )
    .bind(nowForRecovery, DEFAULT_WORKSPACE_ID, nowForRecovery)
    .run();

  const row = await db
    .prepare(
      `select id, workspace_id, post_id, product_sku, title, status, target_format, target_aspect_ratio,
       output_width, output_height, requested_count, prompt_json, product_context_json, result_manifest_json,
       error, locked_by, locked_until, created_at, updated_at, started_at, finished_at
       from imageflow_jobs
       where workspace_id = ? and status = 'queued'
       order by created_at asc limit 1`
    )
    .bind(DEFAULT_WORKSPACE_ID)
    .first<ImageflowJobRow>();
  if (!row) return null;

  const claimResult = await db
    .prepare(
      `update imageflow_jobs
       set status = 'running', locked_by = ?, locked_until = ?, started_at = coalesce(started_at, ?), updated_at = ?
       where id = ? and status = 'queued'`
    )
    .bind(lockedBy, lockedUntil, startedAt, startedAt, row.id)
    .run();
  // NEO: Only the worker that changed queued -> running may process the ImageFlow job.
  if ((claimResult.meta.changes ?? 0) === 0) return null;
  return getImageflowJob(row.id);
}

export async function updateImageflowJob(id: string, patch: ImageflowJobPatch) {
  const existing = await getImageflowJob(id);
  if (!existing) throw new Error("IMAGEFLOW_JOB_NOT_FOUND: Không tìm thấy job ImageFlow.");
  const updatedAt = nowIso();
  const nextStatus = patch.status ? statusOrDefault(patch.status) : existing.status;
  const resetForQueue = nextStatus === "queued";
  const finishedAt = resetForQueue
    ? null
    : nextStatus === "completed" || nextStatus === "failed" || nextStatus === "cancelled"
      ? updatedAt
      : existing.finishedAt;
  const resultManifestJson = patch.resultManifestJson === undefined ? existing.resultManifestJson : safeJson(patch.resultManifestJson);
  const error = patch.error === undefined ? existing.error : patch.error;

  const db = await getD1Database();
  if (!db) {
    const next = {
      ...existing,
      status: nextStatus,
      error,
      resultManifestJson,
      updatedAt,
      finishedAt,
      lockedBy: resetForQueue ? null : existing.lockedBy,
      lockedUntil: resetForQueue ? null : existing.lockedUntil,
      startedAt: resetForQueue ? null : existing.startedAt
    };
    memoryJobs.set(id, next);
    return attachDetails(next);
  }

  await db
    .prepare(
      `update imageflow_jobs
       set status = ?, error = ?, result_manifest_json = ?, updated_at = ?, finished_at = ?,
           locked_by = case when ? = 1 then null else locked_by end,
           locked_until = case when ? = 1 then null else locked_until end,
           started_at = case when ? = 1 then null else started_at end
       where id = ? and workspace_id = ?`
    )
    .bind(nextStatus, error, resultManifestJson, updatedAt, finishedAt, resetForQueue ? 1 : 0, resetForQueue ? 1 : 0, resetForQueue ? 1 : 0, id, DEFAULT_WORKSPACE_ID)
    .run();
  return getImageflowJob(id);
}

export async function saveImageflowAsset(jobId: string, input: UploadedImageflowAssetInput) {
  const job = await getImageflowJob(jobId);
  if (!job) throw new Error("IMAGEFLOW_JOB_NOT_FOUND: Không tìm thấy job ImageFlow.");
  validateImageFile(input.file);

  const bucket = await getBucket();
  if (!bucket) throw new Error("BLOCKED_BY_MISSING_BINDING: BUCKET");

  const assetIndex = safeNumber(input.assetIndex, 0, 0, 99);
  const existingAsset = job.assets?.find((asset) => asset.assetIndex === assetIndex) ?? null;
  const assetId = crypto.randomUUID();
  const mediaId = crypto.randomUUID();
  const createdAt = nowIso();
  const ext = extensionFor(input.file.name, input.file.type);
  const key = `imageflow/${jobId}/${assetId}.${ext}`;
  const publicUrl = `${appBaseUrl()}/api/imageflow/assets/${assetId}`;
  const bytes = await input.file.arrayBuffer();
  const initialStatus: ImageflowAssetStatus = job.targetFormat === "landing_page" ? "needs_review" : "uploaded";

  // NEO: Cầu nối ImageFlow chỉ nhận ảnh render thật từ local rồi lưu R2, không tạo mock trong CRM.
  await bucket.put(key, bytes, {
    httpMetadata: { contentType: input.file.type },
    customMetadata: { imageflowJobId: jobId, originalName: input.file.name }
  });

  const asset: ImageflowAsset = {
    id: assetId,
    workspaceId: DEFAULT_WORKSPACE_ID,
    jobId,
    postId: job.postId,
    mediaId,
    assetIndex,
    role: input.role?.trim() || "album_image",
    status: initialStatus,
    fileName: input.file.name,
    mimeType: input.file.type,
    fileSize: input.file.size,
    r2Key: key,
    publicUrl,
    promptJson: safeJson(input.promptJson),
    createdAt
  };

  const db = await getD1Database();
  if (!db) {
    if (existingAsset) memoryAssets.delete(existingAsset.id);
    memoryAssets.set(asset.id, asset);
    if (existingAsset?.r2Key) await bucket.delete(existingAsset.r2Key);
    return asset;
  }

  const statements = [];
  if (existingAsset) {
    statements.push(
      db.prepare(`delete from imageflow_assets where id = ? and workspace_id = ?`).bind(existingAsset.id, DEFAULT_WORKSPACE_ID)
    );
    if (existingAsset.mediaId) {
      statements.push(
        db.prepare(`delete from content_media where id = ? and workspace_id = ?`).bind(existingAsset.mediaId, DEFAULT_WORKSPACE_ID)
      );
    }
  }
  statements.push(
    db
      .prepare(
        `insert into imageflow_assets
        (id, workspace_id, job_id, post_id, media_id, asset_index, role, status, file_name,
         mime_type, file_size, r2_key, public_url, prompt_json, created_at)
         values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        asset.id,
        asset.workspaceId,
        asset.jobId,
        asset.postId,
        asset.mediaId,
        asset.assetIndex,
        asset.role,
        asset.status,
        asset.fileName,
        asset.mimeType,
        asset.fileSize,
        asset.r2Key,
        asset.publicUrl,
        asset.promptJson,
        asset.createdAt
      ),
    db
      .prepare(
        `insert into content_media
        (id, workspace_id, post_id, media_type, mime_type, file_name, file_size, r2_key, public_url, status, error, created_at)
        values (?, ?, ?, 'image', ?, ?, ?, ?, ?, ?, null, ?)`
      )
      .bind(mediaId, DEFAULT_WORKSPACE_ID, job.postId ?? job.id, asset.mimeType, asset.fileName, asset.fileSize, key, publicUrl, initialStatus, createdAt)
  );
  await db.batch(statements);
  if (existingAsset?.r2Key) await bucket.delete(existingAsset.r2Key);

  return asset;
}

export async function readImageflowAssetById(id: string) {
  const db = await getD1Database();
  if (!db) return memoryAssets.get(id) ?? null;
  const row = await db
    .prepare(
      `select id, workspace_id, job_id, post_id, media_id, asset_index, role, status, file_name,
       mime_type, file_size, r2_key, public_url, prompt_json, created_at
       from imageflow_assets where id = ? and workspace_id = ? limit 1`
    )
    .bind(id, DEFAULT_WORKSPACE_ID)
    .first<ImageflowAssetRow>();
  return row ? mapAsset(row) : null;
}

export async function updateImageflowAssetStatus(id: string, status: ImageflowAssetStatus) {
  const nextStatus = assetStatusOrDefault(status);
  if (nextStatus === "uploaded" && status !== "uploaded") {
    throw new Error("IMAGEFLOW_ASSET_STATUS_INVALID: Trạng thái ảnh không hợp lệ.");
  }
  const existing = await readImageflowAssetById(id);
  if (!existing) throw new Error("IMAGEFLOW_ASSET_NOT_FOUND: Không tìm thấy ảnh ImageFlow.");

  const next = { ...existing, status: nextStatus };
  const db = await getD1Database();
  if (!db) {
    memoryAssets.set(id, next);
    return next;
  }

  const statements = [
    db.prepare("update imageflow_assets set status = ? where id = ? and workspace_id = ?").bind(nextStatus, id, DEFAULT_WORKSPACE_ID)
  ];
  if (existing.mediaId) {
    statements.push(
      db.prepare("update content_media set status = ? where id = ? and workspace_id = ?").bind(nextStatus, existing.mediaId, DEFAULT_WORKSPACE_ID)
    );
  }
  await db.batch(statements);
  return next;
}
