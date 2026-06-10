import { getD1Database } from "@/lib/db";
import { createAlbumPost, createPagePost, publishPhotoPost, schedulePagePost } from "@/lib/facebook/publishing";
import { listContentMedia } from "@/lib/content-media";
import { listContentPosts, updateContentPost } from "@/lib/content-planner";
import { autoPublishEnabled, isAutoPublishRuntimeEnabled } from "@/lib/content-runtime";

export type PublishJob = {
  id: string;
  postId: string;
  pageId: string;
  idempotencyKey: string;
  status: "pending" | "dry_run" | "publishing" | "published" | "failed" | "cancelled" | "scheduled";
  dryRun: boolean;
  scheduledAt?: string | null;
  externalPostId?: string | null;
  error?: string | null;
  createdAt: string;
  updatedAt: string;
};

type JobRow = {
  id: string;
  post_id: string;
  page_id: string;
  idempotency_key: string;
  status: PublishJob["status"];
  dry_run: number;
  scheduled_at: string | null;
  external_post_id: string | null;
  error: string | null;
  created_at: string;
  updated_at: string;
};

const memoryJobs = new Map<string, PublishJob>();

export function isAutoPublishPostsEnabled(env: Record<string, string | undefined> = process.env) {
  return autoPublishEnabled(env);
}

function nowIso() {
  return new Date().toISOString();
}

function mapJob(row: JobRow): PublishJob {
  return {
    id: row.id,
    postId: row.post_id,
    pageId: row.page_id,
    idempotencyKey: row.idempotency_key,
    status: row.status,
    dryRun: Boolean(row.dry_run),
    scheduledAt: row.scheduled_at,
    externalPostId: row.external_post_id,
    error: row.error,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

async function writeLog(job: PublishJob, action: string, status: string, message = "", metadata: Record<string, unknown> = {}) {
  const db = await getD1Database();
  if (!db) return;
  await db
    .prepare(
      `insert into content_publish_logs
      (id, job_id, post_id, page_id, action, status, message, metadata_json, created_at)
      values (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(crypto.randomUUID(), job.id, job.postId, job.pageId, action, status, message, JSON.stringify(metadata), nowIso())
    .run();
}

async function upsertTarget(postId: string, pageId: string) {
  const db = await getD1Database();
  if (!db) return;
  const now = nowIso();
  await db
    .prepare(
      `insert into content_post_targets (id, post_id, page_id, status, created_at, updated_at)
       values (?, ?, ?, 'pending', ?, ?)
       on conflict(post_id, page_id) do update set updated_at = excluded.updated_at`
    )
    .bind(crypto.randomUUID(), postId, pageId, now, now)
    .run();
}

async function saveJob(job: PublishJob) {
  const db = await getD1Database();
  if (!db) {
    const current = memoryJobs.get(job.idempotencyKey);
    const next = current ? { ...current, ...job, id: current.id, createdAt: current.createdAt } : job;
    memoryJobs.set(job.idempotencyKey, next);
    return next;
  }
  await db
    .prepare(
      `insert into content_publish_jobs
      (id, post_id, page_id, idempotency_key, status, dry_run, scheduled_at, external_post_id, error, created_at, updated_at)
      values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      on conflict(idempotency_key) do update set
        status = excluded.status,
        dry_run = excluded.dry_run,
        scheduled_at = excluded.scheduled_at,
        external_post_id = excluded.external_post_id,
        error = excluded.error,
        updated_at = excluded.updated_at`
    )
    .bind(
      job.id,
      job.postId,
      job.pageId,
      job.idempotencyKey,
      job.status,
      job.dryRun ? 1 : 0,
      job.scheduledAt ?? null,
      job.externalPostId ?? null,
      job.error ?? null,
      job.createdAt,
      job.updatedAt
    )
    .run();
  const existing = await db
    .prepare("select * from content_publish_jobs where idempotency_key = ?")
    .bind(job.idempotencyKey)
    .first<JobRow>();
  return existing ? mapJob(existing) : job;
}

export async function addContentPostTargets(postId: string, pageIds: string[]) {
  const uniquePageIds = [...new Set(pageIds.filter(Boolean))];
  await Promise.all(uniquePageIds.map((pageId) => upsertTarget(postId, pageId)));
  return uniquePageIds;
}

export async function replaceContentPostTargets(postId: string, pageIds: string[]) {
  const uniquePageIds = [...new Set(pageIds.filter(Boolean))];
  const db = await getD1Database();
  if (!db) return uniquePageIds;
  // NEO: Khi edit bài, danh sách Fanpage target được thay thế bền trong D1 theo lựa chọn mới.
  await db.prepare("delete from content_post_targets where post_id = ?").bind(postId).run();
  await Promise.all(uniquePageIds.map((pageId) => upsertTarget(postId, pageId)));
  return uniquePageIds;
}

export async function listPublishJobs(postId: string) {
  const db = await getD1Database();
  if (!db) return [...memoryJobs.values()].filter((job) => job.postId === postId);
  const rows = await db
    .prepare("select * from content_publish_jobs where post_id = ? order by updated_at desc")
    .bind(postId)
    .all<JobRow>();
  return (rows.results ?? []).map(mapJob);
}

async function listDuePublishJobs(now = nowIso(), limit = 20) {
  const db = await getD1Database();
  if (!db) {
    return [...memoryJobs.values()]
      .filter((job) => job.status === "scheduled" && !job.dryRun && Boolean(job.scheduledAt) && job.scheduledAt! <= now)
      .slice(0, limit);
  }
  const rows = await db
    .prepare(
      `select * from content_publish_jobs
       where status = 'scheduled' and dry_run = 0 and scheduled_at is not null and scheduled_at <= ?
       order by scheduled_at asc limit ?`
    )
    .bind(now, limit)
    .all<JobRow>();
  return (rows.results ?? []).map(mapJob);
}

function usableMediaUrls(media: Awaited<ReturnType<typeof listContentMedia>>) {
  return media
    .filter((item) => item.mediaType === "image" && Boolean(item.publicUrl) && item.status !== "failed" && item.status !== "rejected")
    .map((item) => item.publicUrl!)
    .filter(Boolean);
}

async function publishPreparedJob(job: PublishJob) {
  const post = (await listContentPosts()).find((item) => item.id === job.postId);
  if (!post) {
    const failed = await saveJob({ ...job, status: "failed", error: "CONTENT_POST_NOT_FOUND", updatedAt: nowIso() });
    await writeLog(failed, "publish_due", "failed", failed.error ?? "");
    return failed;
  }

  if (!(await isAutoPublishRuntimeEnabled())) {
    const dryRun = await saveJob({
      ...job,
      status: "dry_run",
      dryRun: true,
      error: "AUTO_PUBLISH_POSTS_DISABLED",
      updatedAt: nowIso()
    });
    await writeLog(dryRun, "publish_due", "dry_run", dryRun.error ?? "");
    return dryRun;
  }

  const mediaUrls = usableMediaUrls(await listContentMedia(job.postId));
  if (mediaUrls.length === 0) {
    const waiting = await saveJob({
      ...job,
      status: "scheduled",
      error: "WAITING_IMAGEFLOW_ASSETS",
      updatedAt: nowIso()
    });
    await writeLog(waiting, "publish_due_waiting_media", "scheduled", "WAITING_IMAGEFLOW_ASSETS");
    return waiting;
  }

  let publishing = await saveJob({ ...job, status: "publishing", dryRun: false, error: null, updatedAt: nowIso() });
  try {
    const result =
      mediaUrls.length > 1
        ? await createAlbumPost({ pageId: job.pageId, message: post.caption, mediaUrls })
        : await publishPhotoPost({ pageId: job.pageId, message: post.caption, link: mediaUrls[0] });
    publishing = await saveJob({
      ...publishing,
      status: "published",
      externalPostId: result.externalPostId,
      error: null,
      updatedAt: nowIso()
    });
    await updateContentPost(job.postId, { status: "published", externalPostId: result.externalPostId });
    await writeLog(publishing, "publish_due", "published", "", { externalPostId: result.externalPostId, mediaCount: mediaUrls.length });
    return publishing;
  } catch (error) {
    const failed = await saveJob({
      ...publishing,
      status: "failed",
      error: error instanceof Error ? error.message : "Publish lỗi không xác định",
      updatedAt: nowIso()
    });
    await updateContentPost(job.postId, { status: "failed", error: failed.error });
    await writeLog(failed, "publish_due", "failed", failed.error ?? "");
    return failed;
  }
}

export async function createPublishJobs(input: {
  postId: string;
  pageIds: string[];
  scheduledAt?: string | null;
  publishNow?: boolean;
}) {
  const post = (await listContentPosts()).find((item) => item.id === input.postId);
  if (!post) throw new Error("CONTENT_POST_NOT_FOUND");

  const pageIds = await addContentPostTargets(input.postId, input.pageIds.length ? input.pageIds : [post.pageId]);
  const media = await listContentMedia(input.postId);
  const jobs: PublishJob[] = [];

  for (const pageId of pageIds) {
    const now = nowIso();
    const idempotencyKey = `content:${input.postId}:page:${pageId}:${input.scheduledAt || "now"}`;
    let job: PublishJob = {
      id: crypto.randomUUID(),
      postId: input.postId,
      pageId,
      idempotencyKey,
      status: input.scheduledAt ? "scheduled" : "pending",
      dryRun: !(await isAutoPublishRuntimeEnabled()),
      scheduledAt: input.scheduledAt ?? null,
      createdAt: now,
      updatedAt: now
    };

    // NEO: Không tự đăng hàng loạt; khi chưa bật cờ publish thật thì chỉ tạo job dry-run theo từng Page.
    if (input.scheduledAt) {
      job = await saveJob(job);
      await writeLog(job, "schedule", job.status, job.dryRun ? "AUTO_PUBLISH_POSTS_DISABLED" : "");
      jobs.push(job);
      continue;
    }

    if (job.dryRun || !input.publishNow) {
      job.error = job.dryRun ? "AUTO_PUBLISH_POSTS_DISABLED" : null;
      if (job.dryRun && input.publishNow && !input.scheduledAt) job.status = "dry_run";
      job = await saveJob(job);
      await writeLog(job, input.scheduledAt ? "schedule" : "publish_dry_run", job.status, job.error ?? "");
      jobs.push(job);
      continue;
    }

    try {
      job = await saveJob({ ...job, status: "publishing", dryRun: false, updatedAt: nowIso() });
      const mediaUrls = usableMediaUrls(media);
      const result = mediaUrls.length > 1
        ? await createAlbumPost({ pageId, message: post.caption, mediaUrls })
        : mediaUrls[0]
        ? await publishPhotoPost({ pageId, message: post.caption, link: mediaUrls[0] })
        : await createPagePost({ pageId, message: post.caption });
      job = await saveJob({
        ...job,
        status: "published",
        externalPostId: result.externalPostId,
        error: null,
        updatedAt: nowIso()
      });
      await writeLog(job, "publish", "published", "", { externalPostId: result.externalPostId });
      jobs.push(job);
    } catch (error) {
      job = await saveJob({
        ...job,
        status: "failed",
        error: error instanceof Error ? error.message : "Publish lỗi không xác định",
        updatedAt: nowIso()
      });
      await writeLog(job, "publish", "failed", job.error ?? "");
      jobs.push(job);
    }
  }

  if (input.scheduledAt) {
    schedulePagePost({ pageId: pageIds[0] ?? post.pageId, message: post.caption, scheduledAt: input.scheduledAt });
    await updateContentPost(input.postId, { scheduledAt: input.scheduledAt, status: "scheduled" });
  }

  return jobs;
}

export async function publishDueContentJobs(input: { now?: string; limit?: number } = {}) {
  const checkedAt = input.now ?? nowIso();
  const due = await listDuePublishJobs(checkedAt, input.limit ?? 20);
  const jobs: PublishJob[] = [];
  for (const job of due) {
    jobs.push(await publishPreparedJob(job));
  }
  return {
    checkedAt,
    dueCount: due.length,
    publishedCount: jobs.filter((job) => job.status === "published").length,
    waitingMediaCount: jobs.filter((job) => job.error === "WAITING_IMAGEFLOW_ASSETS").length,
    failedCount: jobs.filter((job) => job.status === "failed").length,
    jobs
  };
}

export async function cancelPublishJobs(postId: string) {
  const db = await getD1Database();
  if (!db) {
    let cancelled = 0;
    for (const [key, job] of memoryJobs.entries()) {
      if (job.postId === postId && (job.status === "pending" || job.status === "scheduled")) {
        memoryJobs.set(key, { ...job, status: "cancelled", updatedAt: nowIso() });
        cancelled += 1;
      }
    }
    return { cancelled };
  }
  const result = await db
    .prepare("update content_publish_jobs set status = 'cancelled', updated_at = ? where post_id = ? and status in ('pending', 'scheduled')")
    .bind(nowIso(), postId)
    .run();
  return { cancelled: result.meta.changes ?? 0 };
}

export function resetContentPublishingMemoryForTests() {
  memoryJobs.clear();
}
