#!/usr/bin/env node
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";

const imageflowBaseUrl = (process.env.IMAGEFLOW_LOCAL_BASE_URL || "http://127.0.0.1:7096").replace(/\/$/, "");
const imageflowConfigPath =
  process.env.IMAGEFLOW_CONFIG_PATH || "D:\\codex_manager_v3.1\\tools\\imageflow\\pipeline_config.json";
const jobFile = process.env.IMAGEFLOW_JOB_FILE || "";
const outputDir = process.env.IMAGEFLOW_OUTPUT_DIR || "";
const pollIntervalMs = Number(process.env.IMAGEFLOW_CRM_POLL_INTERVAL_MS || 10000);
const timeoutMs = Number(process.env.IMAGEFLOW_CRM_TIMEOUT_MS || 30 * 60 * 1000);

function log(message) {
  process.stdout.write(`[imageflow-crm-adapter] ${message}\n`);
}

function fail(message) {
  process.stderr.write(`[imageflow-crm-adapter] ${message}\n`);
  process.exitCode = 1;
}

async function httpJson(pathname, init = {}) {
  const response = await fetch(`${imageflowBaseUrl}${pathname}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init.headers || {})
    }
  });
  const text = await response.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { ok: false, message: text };
  }
  if (!response.ok || data.ok === false) {
    throw new Error(data.message || data.error || `ImageFlow request failed: ${response.status}`);
  }
  return data;
}

function parseJson(value, fallback = {}) {
  if (!value) return fallback;
  if (typeof value === "object") return value;
  try {
    return JSON.parse(String(value));
  } catch {
    return fallback;
  }
}

async function readImageflowProfiles() {
  const config = parseJson(await readFile(imageflowConfigPath, "utf8").catch(() => "{}"));
  const chatgpt = config.chatgpt && typeof config.chatgpt === "object" ? config.chatgpt : {};
  const promptConfig = config.chatgpt_prompt && typeof config.chatgpt_prompt === "object" ? config.chatgpt_prompt : {};
  const promptProfileIds = Array.from(
    new Set(
      [...(Array.isArray(promptConfig.profile_ids) ? promptConfig.profile_ids : []), ...(Array.isArray(chatgpt.prompt_profile_ids) ? chatgpt.prompt_profile_ids : [])]
        .map(String)
        .filter(Boolean)
    )
  );
  const renderProfileIds = Array.from(
    new Set((Array.isArray(chatgpt.profile_ids) ? chatgpt.profile_ids : []).map(String).filter(Boolean))
  );
  return {
    provider: String(config.prompt_provider || "chatgpt"),
    promptProfileIds,
    renderProfileIds
  };
}

function normalizeImages(...values) {
  const result = [];
  for (const value of values) {
    if (!value) continue;
    if (Array.isArray(value)) {
      for (const item of value) result.push(...normalizeImages(item));
      continue;
    }
    const text = String(value).trim();
    if (!text) continue;
    for (const part of text.split(/\s+/)) {
      if (/^https?:\/\//i.test(part) && !result.includes(part)) result.push(part);
    }
  }
  return result;
}

function buildProduct(job) {
  const context = parseJson(job.productContextJson);
  const jobPrompt = parseJson(job.promptJson);
  const product = job.product && typeof job.product === "object" ? job.product : {};
  const raw = parseJson(context.rawPayload || product.rawPayload);
  const promptAssets = raw.promptAssets && typeof raw.promptAssets === "object" ? raw.promptAssets : {};
  const imageUrls = normalizeImages(
    context.images,
    context.imageUrl,
    product.images,
    product.imageUrl,
    raw.images,
    raw.imageUrl,
    promptAssets.allImageUrls
  );

  const sku = String(job.productSku || context.sku || product.sku || raw.sku || "").trim();
  const name = String(context.name || product.name || raw.name || job.title || sku).trim();
  const description = String(context.description || product.description || raw.description || "").trim();
  const promptText = String(promptAssets.promptText || `${name}\n\n${description}`.trim());
  const frameSpec = jobPrompt.frameSpec && typeof jobPrompt.frameSpec === "object" ? jobPrompt.frameSpec : null;
  const frameSpecText = frameSpec
    ? [
        "YEU CAU KHUNG HINH BAT BUOC:",
        `- Moi anh phai dung ti le ${job.targetAspectRatio || "4:5"} va kich thuoc ${Number(job.outputWidth || 1080)}x${Number(job.outputHeight || 1350)}px.`,
        "- Khong tao anh vuong/ngang neu job yeu cau 4:5.",
        "- Khong de chu, gia, logo hoac san pham cham mep khung.",
        "- San pham chinh nam trong safe area, khong bi crop mat chi tiet quan trong.",
        "- Neu tao album nhieu anh, moi anh dung dung slot/index trong frameSpec.",
        JSON.stringify(frameSpec)
      ].join("\n")
    : "";

  return {
    id: raw.id || product.externalProductId || product.id || sku,
    platform: raw.platform || "",
    shopName: raw.shopName || "",
    sku,
    name,
    category: context.category || product.category || raw.category || "",
    description,
    costPrice: Number(product.costPrice || raw.costPrice || 0),
    originalPrice: Number(context.originalPrice || product.originalPrice || raw.originalPrice || 0),
    salePrice: Number(context.price || product.salePrice || raw.salePrice || raw.currentPrice || 0),
    currentPrice: Number(context.price || product.currentPrice || raw.currentPrice || raw.salePrice || 0),
    currency: context.currency || product.currency || raw.currency || "VND",
    imageUrl: imageUrls[0] || "",
    images: imageUrls,
    status: product.status || raw.status || "active",
    stock: Number(context.stock || product.stock || raw.stock || 0),
    availableStock: Number(product.availableStock || raw.availableStock || context.stock || 0),
    reservedStock: Number(product.reservedStock || raw.reservedStock || 0),
    promptAssets: {
      allImageUrls: imageUrls,
      promptText: `${promptText}\n\nSKU: ${sku}${frameSpecText ? `\n\n${frameSpecText}` : ""}`
    },
    raw_row: raw,
    __imageflow_options: {
      target_format: job.targetFormat || "facebook_album",
      aspect_ratio: job.targetAspectRatio || "4:5",
      image_ratio: job.targetAspectRatio || "4:5",
      output_width: Number(job.outputWidth || 1080),
      output_height: Number(job.outputHeight || 1350),
      output_size: `${Number(job.outputWidth || 1080)}x${Number(job.outputHeight || 1350)}`,
      frame_spec: frameSpec,
      fallback_transform: "pad_or_smart_crop"
    }
  };
}

function findQueueItem(queue, sku) {
  const items = Array.isArray(queue.items) ? queue.items : [];
  return items.find((item) => {
    const product = item.product && typeof item.product === "object" ? item.product : {};
    return String(item.sku || product.sku || product.platform_sku || "") === String(sku);
  });
}

function hasOtherActiveQueueItem(queue, sku) {
  const activeStatuses = new Set(["rendering", "running", "prompting", "processing"]);
  return (Array.isArray(queue.items) ? queue.items : []).some((item) => {
    const product = item.product && typeof item.product === "object" ? item.product : {};
    const itemSku = String(item.sku || product.sku || product.platform_sku || "");
    const status = String(item.status || "").toLowerCase();
    const renderStatus = String(item.render_status || "").toLowerCase();
    return itemSku !== String(sku) && (activeStatuses.has(status) || activeStatuses.has(renderStatus));
  });
}

async function waitForFinalImages(queueId, requestedCount) {
  const waitStartedAt = Date.now();
  const started = Date.now();
  let lastError = "";
  while (Date.now() - started < timeoutMs) {
    const result = await httpJson("/api/product-queue/open-output-folder", {
      method: "POST",
      body: JSON.stringify({ queue_id: queueId })
    }).catch((error) => {
      lastError = error.message;
      return null;
    });

    const queue = await httpJson("/api/product-queue").catch(() => null);
    const item = queue ? (Array.isArray(queue.items) ? queue.items : []).find((x) => String(x.id) === String(queueId)) : null;
    const status = String(item?.status || "").toLowerCase();
    const finalPaths = [];
    for (const filePath of Array.isArray(result?.final_paths) ? result.final_paths.filter(Boolean) : []) {
      const info = await stat(filePath).catch(() => null);
      if (info && info.mtimeMs >= waitStartedAt) finalPaths.push(filePath);
    }
    if (finalPaths.length >= requestedCount) return finalPaths.slice(0, requestedCount);
    if (status === "done" && finalPaths.length > 0) return finalPaths.slice(0, requestedCount || finalPaths.length);
    const error = String(item?.error || "").trim();
    if (status === "failed" && error) throw new Error(error);
    await new Promise((resolve) => setTimeout(resolve, Number.isFinite(pollIntervalMs) ? pollIntervalMs : 10000));
  }
  throw new Error(lastError || `Timed out waiting for ImageFlow final images for queue ${queueId}`);
}

async function main() {
  if (!jobFile) {
    fail("IMAGEFLOW_JOB_FILE is required.");
    return;
  }
  if (!outputDir) {
    fail("IMAGEFLOW_OUTPUT_DIR is required.");
    return;
  }

  const job = parseJson(await readFile(jobFile, "utf8"));
  const product = buildProduct(job);
  if (!product.sku) throw new Error("CRM job missing product SKU.");
  if (!product.imageUrl) throw new Error(`Product ${product.sku} has no image URL for ImageFlow.`);

  const status = await httpJson("/api/status");
  const queueBefore = await httpJson("/api/product-queue");
  const cdpRunnerActive = Boolean(status.cdp_queue?.running);
  if (cdpRunnerActive && hasOtherActiveQueueItem(queueBefore, product.sku)) {
    throw new Error("ImageFlow local queue is busy with another product. Wait for it to finish, then run the bridge again.");
  }

  const addResult = await httpJson("/api/product-queue/add", {
    method: "POST",
    body: JSON.stringify({ products: [product] })
  });
  const item = findQueueItem(addResult, product.sku) || findQueueItem(await httpJson("/api/product-queue"), product.sku);
  if (!item?.id) throw new Error(`ImageFlow queue item was not created for SKU ${product.sku}.`);

  log(`queued ${product.sku} as ${item.id}`);

  if (!cdpRunnerActive) {
    const profiles = await readImageflowProfiles();
    if (!profiles.promptProfileIds.length) throw new Error("ImageFlow config has no prompt profile IDs.");
    if (!profiles.renderProfileIds.length) throw new Error("ImageFlow config has no render profile IDs.");
    await httpJson("/api/product-queue/start", {
      method: "POST",
      body: JSON.stringify({
        automation_mode: "cdp",
        provider: profiles.provider,
        prompt_profile_ids: profiles.promptProfileIds,
        render_profile_ids: profiles.renderProfileIds,
        target_count: Number(job.requestedCount || 5)
      })
    }).catch((error) => {
      throw new Error(`Cannot start ImageFlow CDP queue: ${error.message}`);
    });
  }

  const finalPaths = await waitForFinalImages(item.id, Number(job.requestedCount || 5));
  await mkdir(outputDir, { recursive: true });
  await writeFile(
    path.join(outputDir, "manifest.json"),
    `${JSON.stringify(
      {
        source: "imageflow-local",
        queueId: item.id,
        productSku: product.sku,
        images: finalPaths.map((file, index) => ({
          file,
          role: "album_image",
          prompt: {
            assetIndex: index,
            aspectRatio: job.targetAspectRatio || "4:5",
            productSku: product.sku,
            frameSpec: parseJson(job.promptJson).frameSpec || null
          }
        }))
      },
      null,
      2
    )}\n`,
    "utf8"
  );
  log(`manifest ready with ${finalPaths.length} image(s)`);
}

main().catch((error) => {
  fail(error instanceof Error ? error.message : String(error));
});
