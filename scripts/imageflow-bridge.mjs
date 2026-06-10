#!/usr/bin/env node
import { spawn } from "node:child_process";
import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const baseUrl = (process.env.FBSHV_CRM_BASE_URL || "https://fbshv-crm.ngchihuy.workers.dev").replace(/\/$/, "");
const token = process.env.IMAGEFLOW_BRIDGE_TOKEN || "";
const workDir = process.env.IMAGEFLOW_WORK_DIR || "D:\\codex_manager_v3.1\\tools\\imageflow\\work\\crm_bridge";
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const defaultCommand = `node "${path.join(scriptDir, "imageflow-crm-adapter.mjs")}"`;
const command = process.env.IMAGEFLOW_COMMAND || defaultCommand;
const workerId = process.env.IMAGEFLOW_WORKER_ID || `imageflow-local-${process.env.COMPUTERNAME || "windows"}`;
const watch =
  process.argv.includes("--watch") ||
  process.env.IMAGEFLOW_BRIDGE_MODE === "watch" ||
  process.env.IMAGEFLOW_BRIDGE_WATCH === "true";
const once = process.argv.includes("--once") || !watch;
const intervalMs = Number(process.env.IMAGEFLOW_POLL_INTERVAL_MS || 15000);
const adapterTimeoutMs = Number(process.env.IMAGEFLOW_ADAPTER_TIMEOUT_MS || 10 * 60 * 1000);
let tickRunning = false;
let emptyCount = 0;

function log(message) {
  process.stdout.write(`[imageflow-bridge] ${message}\n`);
}

function sanitizeError(error) {
  const text = error instanceof Error ? error.message : String(error);
  return text.replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/g, "Bearer ***").replace(token, "***");
}

function statusForLocalError(message) {
  const normalized = message.toLowerCase();
  const recoverableMarkers = [
    "queue is busy",
    "queue is already running",
    "pipeline lock",
    "profile",
    "session",
    "login",
    "cdp",
    "no prompt profile",
    "no render profile",
    "cannot start imageflow"
  ];
  return recoverableMarkers.some((marker) => normalized.includes(marker)) ? "needs_user" : "failed";
}

async function crmFetch(pathname, init = {}) {
  if (!token) throw new Error("IMAGEFLOW_BRIDGE_TOKEN is required locally.");
  const response = await fetch(`${baseUrl}${pathname}`, {
    ...init,
    headers: {
      ...(init.headers || {}),
      authorization: `Bearer ${token}`
    }
  });
  const text = await response.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { success: false, error: text };
  }
  if (!response.ok || data.success === false) {
    throw new Error(data.error || `CRM request failed: ${response.status}`);
  }
  return data.data;
}

async function claimJob() {
  const data = await crmFetch("/api/imageflow/jobs/next", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ workerId })
  });
  return data.job;
}

async function patchJob(jobId, patch) {
  await crmFetch(`/api/imageflow/jobs/${jobId}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(patch)
  });
}

function mimeFor(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".png") return "image/png";
  if (ext === ".webp") return "image/webp";
  return "application/octet-stream";
}

async function uploadAsset(jobId, filePath, assetIndex, promptJson) {
  const bytes = await readFile(filePath);
  const form = new FormData();
  form.set("file", new Blob([bytes], { type: mimeFor(filePath) }), path.basename(filePath));
  form.set("assetIndex", String(assetIndex));
  form.set("role", String(promptJson?.role || "album_image"));
  if (promptJson) form.set("promptJson", JSON.stringify(promptJson));
  await crmFetch(`/api/imageflow/jobs/${jobId}/assets`, { method: "POST", body: form });
}

async function findImages(outputDir) {
  const entries = await readdir(outputDir, { withFileTypes: true }).catch(() => []);
  const files = [];
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    const filePath = path.join(outputDir, entry.name);
    if (!/\.(png|jpe?g|webp)$/i.test(entry.name)) continue;
    const info = await stat(filePath);
    files.push({ filePath, mtimeMs: info.mtimeMs });
  }
  return files.sort((a, b) => a.mtimeMs - b.mtimeMs).map((item) => item.filePath);
}

async function runImageflowCommand(jobFile, outputDir) {
  if (!command.trim()) return { configured: false };
  return new Promise((resolve, reject) => {
    let settled = false;
    const child = spawn(command, {
      shell: true,
      stdio: "inherit",
      env: {
        ...process.env,
        IMAGEFLOW_JOB_FILE: jobFile,
        IMAGEFLOW_JOB_ID: path.basename(path.dirname(jobFile)),
        IMAGEFLOW_OUTPUT_DIR: outputDir
      }
    });
    const finish = (callback) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      callback();
    };
    const timeout = setTimeout(() => {
      child.kill();
      finish(() => reject(new Error(`adapter_timeout: ImageFlow adapter did not finish within ${adapterTimeoutMs}ms`)));
    }, Math.max(60_000, adapterTimeoutMs));
    child.on("exit", (code) =>
      finish(() => (code === 0 ? resolve({ configured: true }) : reject(new Error(`IMAGEFLOW_COMMAND exited ${code}`))))
    );
    child.on("error", (error) => finish(() => reject(error)));
  });
}

async function processJob(job) {
  const jobDir = path.join(workDir, job.id);
  const outputDir = path.join(jobDir, "output");
  const jobFile = path.join(jobDir, "job.json");
  await mkdir(outputDir, { recursive: true });
  await writeFile(jobFile, `${JSON.stringify(job, null, 2)}\n`, "utf8");

  let result;
  try {
    result = await runImageflowCommand(jobFile, outputDir);
  } catch (error) {
    const message = sanitizeError(error);
    await patchJob(job.id, {
      status: statusForLocalError(message),
      error: message
    });
    log(`job ${job.id} failed: ${message}`);
    return;
  }
  if (!result.configured) {
    await patchJob(job.id, {
      status: "needs_user",
      error: `Đã tạo job local tại ${jobDir}. Cần cấu hình IMAGEFLOW_COMMAND để render và upload tự động.`
    });
    log(`job ${job.id} staged at ${jobDir}`);
    return;
  }

  const manifestPath = path.join(outputDir, "manifest.json");
  const manifestText = await readFile(manifestPath, "utf8").catch(() => "{}");
  const manifest = JSON.parse(manifestText);
  const manifestImages = Array.isArray(manifest.images) ? manifest.images : [];
  const imagePaths = manifestImages.length
    ? manifestImages.map((item) => path.resolve(outputDir, String(item.file || item.path || item))).filter(Boolean)
    : await findImages(outputDir);

  for (let index = 0; index < imagePaths.length; index += 1) {
    const manifestItem = manifestImages[index] || {};
    await uploadAsset(job.id, imagePaths[index], index, { ...(manifestItem.prompt || {}), role: manifestItem.role });
  }

  const needsReview = job.targetFormat === "landing_page";
  await patchJob(job.id, {
    status: needsReview ? "needs_user" : "completed",
    error: needsReview ? `Ảnh đã về CRM. Cần duyệt ảnh trong màn hình Cầu nối ảnh AI trước khi dùng trên landing page.` : null,
    resultManifestJson: { ...manifest, uploadedCount: imagePaths.length, completedBy: workerId, reviewRequired: needsReview }
  });
  log(`job ${job.id} ${needsReview ? "waiting for review" : "completed"}, uploaded ${imagePaths.length} image(s)`);
}

async function tick() {
  if (tickRunning) {
    log("previous poll is still running; skip overlapping claim");
    return "skipped";
  }
  tickRunning = true;
  try {
    const job = await claimJob();
    if (!job) {
      emptyCount += 1;
      log(`no queued job (empty streak: ${emptyCount})`);
      return "empty";
    }
    emptyCount = 0;
    log(`claimed job ${job.id} for SKU ${job.productSku}`);
    await processJob(job);
    return "processed";
  } catch (error) {
    emptyCount = 0;
    log(sanitizeError(error));
    return "error";
  } finally {
    tickRunning = false;
  }
}

await mkdir(workDir, { recursive: true });
if (once) {
  await tick();
} else {
  const delayMs = Number.isFinite(intervalMs) ? Math.max(5000, intervalMs) : 15000;
  while (watch) {
    const result = await tick();
    const waitMs =
      result === "empty" && emptyCount > 0
        ? Math.min(delayMs * emptyCount, 120_000)
        : delayMs;
    await new Promise((resolve) => setTimeout(resolve, waitMs));
  }
}
