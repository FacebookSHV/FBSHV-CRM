#!/usr/bin/env node
import { mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";

const imageflowBaseUrl = (process.env.IMAGEFLOW_LOCAL_BASE_URL || "http://127.0.0.1:7096").replace(/\/$/, "");
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

async function assertPoolSchedulerReady() {
  await httpJson("/api/pool/status").catch((error) => {
    throw new Error(`Pool Scheduler chua san sang tai ${imageflowBaseUrl}: ${error.message}`);
  });
  log("Pool Scheduler ready; ImageFlow will allocate account/profile.");
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

function facebookPlacementForTargetFormat(targetFormat) {
  const value = String(targetFormat || "").trim().toLowerCase();
  if (value === "facebook_banner") return "banner";
  if (value === "facebook_story") return "story";
  if (value === "facebook_logo") return "logo";
  if (value === "facebook_feed" || value === "facebook_album") return "feed";
  return "";
}

function imageflowPipelineForJob(job) {
  return facebookPlacementForTargetFormat(job?.targetFormat) ? "facebook_ads" : undefined;
}

function facebookLabelForPlacement(placement) {
  if (placement === "banner") return "Banner";
  if (placement === "story") return "Story/Reels";
  if (placement === "logo") return "Logo/Avatar";
  if (placement === "feed") return "Feed 4:5";
  return "";
}

function safeSlug(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);
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

function objectValue(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function normalizeVariants(...values) {
  const result = [];
  for (const value of values) {
    if (!Array.isArray(value)) continue;
    for (const item of value) {
      if (item && typeof item === "object" && !Array.isArray(item)) result.push(item);
    }
  }
  return result;
}

function variantImages(variants) {
  return normalizeImages(variants.map((variant) => [variant.images, variant.imageUrl, variant.image_url]));
}

function buildLandingCopyText(jobPrompt) {
  const copy = objectValue(jobPrompt.landingCopy);
  if (!Object.keys(copy).length) return "";
  return [
    "LANDING PAGE COPY CONTEXT:",
    JSON.stringify(
      {
        hero: copy.hero || {},
        sections: copy.sections || {},
        seo: copy.seo || {}
      },
      null,
      2
    )
  ].join("\n");
}

function buildReferenceScarcityText(imageUrls) {
  const count = Array.isArray(imageUrls) ? imageUrls.length : 0;
  if (count > 1) {
    return [
      "REFERENCE ROUTING:",
      `- Product Core exposes ${count} reference images. Use the full attached reference set together.`,
      "- Every storyboard item must set source_images to the exact references needed for that frame."
    ].join("\n");
  }
  return [
    "REFERENCE SCARCITY MODE - NON NEGOTIABLE:",
    "- Product Core exposes only 1 reference image for this SKU.",
    "- Every storyboard item MUST set source_images: [1].",
    "- Use the exact uploaded source photo as the product layer in every frame.",
    "- Do not redraw, regenerate, replace, restyle, or invent the PCB, remote, button panel, cable, label, component layout, or model.",
    "- Build each frame by cropping, zooming, arranging, adding clean background, badges, arrows, callouts, and price/CTA around the exact source photo.",
    "- If a requested install/usage/compatibility frame cannot be supported by the single reference image, make a safe checklist/callout composition around the exact source photo instead of inventing wiring, fans, or a different controller.",
    "- Do not claim a narrow use case such as fan-water-only unless Product Core text explicitly says so."
  ].join("\n");
}

function buildProduct(job) {
  const context = parseJson(job.productContextJson);
  const jobPrompt = parseJson(job.promptJson);
  const facebookPlacement = facebookPlacementForTargetFormat(job.targetFormat || jobPrompt.targetFormat);
  const product = job.product && typeof job.product === "object" ? job.product : {};
  const raw = parseJson(context.rawPayload || product.rawPayload);
  const promptAssets = {
    ...objectValue(raw.promptAssets),
    ...objectValue(context.promptAssets),
    ...objectValue(product.promptAssets)
  };
  const variants = normalizeVariants(context.variants, product.variants, raw.variants);
  const imageUrls = normalizeImages(
    context.images,
    context.imageUrl,
    product.images,
    product.imageUrl,
    raw.images,
    raw.imageUrl,
    promptAssets.allImageUrls,
    variantImages(variants)
  );

  const sku = String(job.productSku || context.sku || product.sku || raw.sku || "").trim();
  const name = String(context.name || product.name || raw.name || job.title || sku).trim();
  const description = String(context.description || product.description || raw.description || "").trim();
  const promptText = String(promptAssets.promptText || `${name}\n\n${description}`.trim());
  const landingCopyText = buildLandingCopyText(jobPrompt);
  const referenceScarcityText = buildReferenceScarcityText(imageUrls);
  const frameSpec = jobPrompt.frameSpec && typeof jobPrompt.frameSpec === "object" ? jobPrompt.frameSpec : null;
  const outputWidth = Number(job.outputWidth || 1080);
  const outputHeight = Number(job.outputHeight || 1350);
  const targetAspectRatio = job.targetAspectRatio || "4:5";
  const targetFormat = job.targetFormat || "facebook_album";
  const jobShortId = safeSlug(job.id || job.postId || job.title || Date.now()).slice(0, 12);
  const externalProductId = String(raw.id || product.externalProductId || product.id || sku).trim();
  const imageflowOptions = {
    target_format: targetFormat,
    aspect_ratio: targetAspectRatio,
    image_ratio: targetAspectRatio,
    output_width: outputWidth,
    output_height: outputHeight,
    output_size: `${outputWidth}x${outputHeight}`,
    pipeline: facebookPlacement ? "facebook_ads" : "",
    fb_format: facebookPlacement,
    fb_label: facebookLabelForPlacement(facebookPlacement),
    frame_spec: frameSpec,
    reference_scarcity_mode: imageUrls.length <= 1,
    storyboard_source_images_required: imageUrls.length <= 1 ? [1] : "per-slot",
    fallback_transform: facebookPlacement ? "pad_or_smart_crop" : ""
  };
  const frameSpecText = frameSpec
    ? [
        "YEU CAU KHUNG HINH BAT BUOC:",
        `- Moi anh phai dung ti le ${targetAspectRatio} va kich thuoc ${outputWidth}x${outputHeight}px.`,
        "- Khong tao anh vuong/ngang neu job yeu cau 4:5.",
        "- Khong de chu, gia, logo hoac san pham cham mep khung.",
        "- San pham chinh nam trong safe area, khong bi crop mat chi tiet quan trong.",
        "- Neu tao album nhieu anh, moi anh dung dung slot/index trong frameSpec.",
        JSON.stringify(frameSpec)
      ].join("\n")
    : "";
  const claimPolicy = objectValue(jobPrompt.claimPolicy);
  const claimPolicyText = Object.keys(claimPolicy).length
    ? [
        "FACEBOOK CLAIM LOCK - BAT BUOC:",
        JSON.stringify(claimPolicy, null, 2),
        "- Moi text hook, headline, badge va prompt_ai chi duoc dung claim co trong Product Core hoac anh tham chieu.",
        "- Neu khong chac mot claim co that hay khong, bo claim do ra khoi anh.",
        "- Khong tao danh gia, luot ban, countdown, bao hanh, giam gia, vat lieu tuong thich, cach dung, hoac loi chung thuc neu Product Core khong cung cap."
      ].join("\n")
    : "";

  return {
    id: externalProductId || sku,
    platform: raw.platform || "",
    shopName: raw.shopName || "",
    shop: raw.shopName || "",
    platform_product_id: `${externalProductId || sku}-${jobShortId}`,
    sku,
    slug: `${safeSlug(sku || name)}-crm-${jobShortId}`,
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
      promptText: `${promptText}\n\nSKU: ${sku}\n\n${referenceScarcityText}${claimPolicyText ? `\n\n${claimPolicyText}` : ""}${landingCopyText ? `\n\n${landingCopyText}` : ""}${frameSpecText ? `\n\n${frameSpecText}` : ""}`
    },
    variants,
    raw_row: {
      ...raw,
      sku: raw.sku || sku,
      images: imageUrls,
      promptAssets: {
        ...promptAssets,
        allImageUrls: imageUrls,
        promptText: `${promptText}\n\nSKU: ${sku}\n\n${referenceScarcityText}${claimPolicyText ? `\n\n${claimPolicyText}` : ""}${landingCopyText ? `\n\n${landingCopyText}` : ""}${frameSpecText ? `\n\n${frameSpecText}` : ""}`
      },
      variants,
      __imageflow_options: imageflowOptions
    },
    __imageflow_options: imageflowOptions
  };
}

function findQueueItem(queue, sku, preferredPipeline = "") {
  const items = Array.isArray(queue.items) ? queue.items : [];
  const matches = items.filter((item) => {
    const product = item.product && typeof item.product === "object" ? item.product : {};
    return String(item.sku || product.sku || product.platform_sku || "") === String(sku);
  });
  if (!matches.length) return null;
  if (preferredPipeline) {
    const preferred = matches.find((item) => String(item.pipeline || "").toLowerCase() === preferredPipeline);
    if (preferred) return preferred;
  }
  return matches[0];
}

function queueItemRenderComplete(item, requestedCount) {
  const status = String(item?.status || "").toLowerCase();
  const promptStatus = String(item?.prompt_status || "").toLowerCase();
  const renderStatus = String(item?.render_status || "").toLowerCase();
  const renderDone = Number(item?.render_done || 0);
  const renderTotal = Number(item?.render_total || 0);
  const expectedCount = Math.max(1, Number(requestedCount || 1));
  return (
    (status === "done" || status === "completed" || renderStatus === "done") &&
    (promptStatus === "done" || !promptStatus) &&
    renderDone >= expectedCount &&
    (renderTotal === 0 || renderTotal >= expectedCount)
  );
}

async function waitForFinalImages(queueId, requestedCount, waitStartedAt) {
  const started = Date.now();
  let lastError = "";
  while (Date.now() - started < timeoutMs) {
    const queue = await httpJson("/api/product-queue").catch((error) => {
      lastError = error.message;
      return null;
    });
    const item = queue ? (Array.isArray(queue.items) ? queue.items : []).find((x) => String(x.id) === String(queueId)) : null;
    const status = String(item?.status || "").toLowerCase();
    const promptStatus = String(item?.prompt_status || "").toLowerCase();
    const renderStatus = String(item?.render_status || "").toLowerCase();
    const finalPaths = item ? await findFinalImageflowOutputs(item, waitStartedAt) : [];
    const error = String(item?.error || "").trim();
    if (queueItemRenderComplete(item, requestedCount) && finalPaths.length >= requestedCount) {
      return finalPaths.slice(0, requestedCount);
    }
    if (error && (status === "failed" || promptStatus === "failed" || renderStatus === "failed")) throw new Error(error);
    await new Promise((resolve) => setTimeout(resolve, Number.isFinite(pollIntervalMs) ? pollIntervalMs : 10000));
  }
  throw new Error(lastError || `Timed out waiting for ImageFlow final images for queue ${queueId}`);
}

function productDirFromPackagePath(packagePath) {
  const normalized = String(packagePath || "").trim();
  if (!normalized) return "";
  return path.basename(path.dirname(normalized)).toLowerCase() === "meta"
    ? path.dirname(path.dirname(normalized))
    : path.dirname(normalized);
}

async function findFinalImageflowOutputs(queueItem, waitStartedAt) {
  const packagePath = String(queueItem?.product_package_path || "").trim();
  const productDir = productDirFromPackagePath(packagePath);
  if (!productDir) return [];
  const outputDirs = [
    path.join(productDir, "output", "chatgpt_cdp_renders"),
    path.join(productDir, "output", "image_renders"),
    path.join(productDir, "output")
  ];
  const files = [];
  for (const dir of outputDirs) {
    const entries = await readdir(dir, { withFileTypes: true }).catch(() => []);
    for (const entry of entries) {
      if (!entry.isFile() || !/\.(png|jpe?g|webp)$/i.test(entry.name)) continue;
      const filePath = path.join(dir, entry.name);
      const info = await stat(filePath).catch(() => null);
      if (info && info.mtimeMs >= waitStartedAt) files.push({ filePath, mtimeMs: info.mtimeMs });
    }
  }
  return Array.from(new Map(files.sort((a, b) => a.mtimeMs - b.mtimeMs).map((item) => [item.filePath, item.filePath])).values());
}

async function readPackageInfo(queueItem) {
  const packagePath = String(queueItem?.product_package_path || "").trim();
  if (!packagePath) return { packagePath: "", sourceImageCount: Number(queueItem?.image_count || 0) };
  const payload = parseJson(await readFile(packagePath, "utf8").catch(() => "{}"));
  const images = payload.images && typeof payload.images === "object" ? payload.images : {};
  const local = Array.isArray(images.local) ? images.local.filter(Boolean) : [];
  const remote = Array.isArray(images.remote) ? images.remote.filter(Boolean) : [];
  return {
    packagePath,
    sourceImageCount: local.length || Number(queueItem?.image_count || 0),
    remoteImageCount: remote.length,
    descriptionLength: String(payload.product?.description || "").length,
    variantCount: Array.isArray(payload.variants) ? payload.variants.length : 0
  };
}

async function clearStaleImageflowOutputs(queueItem) {
  const packagePath = String(queueItem?.product_package_path || "").trim();
  if (!packagePath) return;
  const productDir = productDirFromPackagePath(packagePath);
  const metaDir = path.join(productDir, "meta");
  await rm(path.join(productDir, "chatgpt_cdp_renders"), { recursive: true, force: true }).catch(() => {});
  await rm(path.join(productDir, "output", "chatgpt_cdp_renders"), { recursive: true, force: true }).catch(() => {});
  await rm(path.join(productDir, "output", "image_renders"), { recursive: true, force: true }).catch(() => {});
  for (const fileName of [
    "image_prompts.json",
    "image_prompts_chatgpt_cdp_prompt.json",
    "chatgpt_cdp_prompt_response.txt"
  ]) {
    await rm(path.join(productDir, fileName), { force: true }).catch(() => {});
  }

  // NEO: Buộc ImageFlow tạo lại prompt theo claim policy mới của CRM.
  for (const fileName of ["image_prompts.json", "prompt_core_migration_state.json"]) {
    await rm(path.join(metaDir, fileName), { force: true }).catch(() => {});
  }
  const metaEntries = await readdir(metaDir, { withFileTypes: true }).catch(() => []);
  for (const entry of metaEntries) {
    if (entry.isFile() && /^prompt_manifest_.*\.json$/i.test(entry.name)) {
      await rm(path.join(metaDir, entry.name), { force: true }).catch(() => {});
    }
  }
}

async function enhanceImageflowPackage(queueItem, jobPrompt, product) {
  const packagePath = String(queueItem?.product_package_path || "").trim();
  if (!packagePath) return;
  const payload = parseJson(await readFile(packagePath, "utf8").catch(() => "{}"));
  if (!payload || typeof payload !== "object") return;
  const crmContext = {
    source: "fbshv-crm",
    productSku: product.sku,
    productName: product.name,
    landingCopy: objectValue(jobPrompt.landingCopy),
    creativeBrief: objectValue(jobPrompt.creativeBrief),
    frameSpec: objectValue(jobPrompt.frameSpec),
    facebookPlacement: String(jobPrompt.placement || facebookPlacementForTargetFormat(jobPrompt.targetFormat) || ""),
    claimPolicy: objectValue(jobPrompt.claimPolicy),
    templateId: String(jobPrompt.templateId || ""),
    templateBlueprint: objectValue(jobPrompt.templateBlueprint),
    proofPolicy: {
      keepWhenReal: ["discount", "soldCount", "rating", "reviews", "countdown", "testimonials"],
      neverInvent: true
    },
    referenceScarcityMode: Array.isArray(product.images) ? product.images.length <= 1 : true,
    storyboardRules: [
      "Every generated image prompt item must include source_images.",
      "If only one reference exists, every item must include source_images: [1].",
      "Only borrow layout/style from storyboard text; uploaded references override any wrong product noun, model, accessory, use case, or scene."
    ],
    nonNegotiableRenderGuard: [
      "Use the downloaded source_images as the product layer. Do not redraw a new circuit board, remote, button panel, cable, packaging, or different controller kit.",
      "If reference count is low, create marketplace layouts by cropping, zooming, arranging, and adding callouts around the exact source photo instead of inventing product geometry.",
      "Reject frames that change PCB component layout, remote button count/layout, button-panel color/layout, or product model identity."
    ]
  };
  const briefLines = [
    "FBSHV CRM LANDING CREATIVE BRIEF:",
    JSON.stringify(crmContext, null, 2)
  ];
  const existingProduct = objectValue(payload.product);
  const existingDescription = String(existingProduct.description || "").trim();
  const nextDescription = [existingDescription, briefLines.join("\n")].filter(Boolean).join("\n\n");
  const productPromptAssets = objectValue(product.promptAssets);
  const existingPromptAssets = objectValue(payload.prompt_assets);
  const mergedPromptAssets = {
    ...existingPromptAssets,
    ...productPromptAssets,
    allImageUrls: Array.isArray(product.images) ? product.images : existingPromptAssets.allImageUrls,
    promptText: productPromptAssets.promptText || existingPromptAssets.promptText || ""
  };
  payload.product = {
    ...existingProduct,
    sku: product.sku || existingProduct.sku,
    slug: product.slug || existingProduct.slug,
    promptAssets: mergedPromptAssets,
    __imageflow_options: product.__imageflow_options,
    description: nextDescription,
    prompt_text: [
      String(productPromptAssets.promptText || existingProduct.prompt_text || "").trim(),
      briefLines.join("\n")
    ]
      .filter(Boolean)
      .join("\n\n")
  };
  payload.prompt_assets = mergedPromptAssets;
  payload.raw_row = {
    ...objectValue(payload.raw_row),
    promptAssets: mergedPromptAssets,
    __imageflow_options: product.__imageflow_options
  };
  payload.target_format = product.__imageflow_options?.target_format || payload.target_format;
  payload.aspect_ratio = product.__imageflow_options?.aspect_ratio || payload.aspect_ratio;
  payload.output_width = product.__imageflow_options?.output_width || payload.output_width;
  payload.output_height = product.__imageflow_options?.output_height || payload.output_height;
  payload.output_size = product.__imageflow_options?.output_size || payload.output_size;
  payload.context = {
    ...objectValue(payload.context),
    crmLanding: crmContext
  };
  await writeFile(packagePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
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

  await assertPoolSchedulerReady();

  const job = parseJson(await readFile(jobFile, "utf8"));
  const product = buildProduct(job);
  if (!product.sku) throw new Error("CRM job missing product SKU.");
  const imageflowPipeline = imageflowPipelineForJob(job);

  const addResult = await httpJson("/api/product-queue/add", {
    method: "POST",
    body: JSON.stringify({ products: [product], ...(imageflowPipeline ? { pipeline: imageflowPipeline } : {}) })
  });
  const item =
    findQueueItem(addResult, product.sku, imageflowPipeline) ||
    findQueueItem(await httpJson(imageflowPipeline ? `/api/product-queue?pipeline=${imageflowPipeline}` : "/api/product-queue"), product.sku, imageflowPipeline) ||
    findQueueItem(await httpJson("/api/product-queue"), product.sku, imageflowPipeline);
  if (!item?.id) throw new Error(`ImageFlow queue item was not created for SKU ${product.sku}.`);
  const jobPrompt = parseJson(job.promptJson);
  await enhanceImageflowPackage(item, jobPrompt, product);
  await clearStaleImageflowOutputs(item);
  const packageInfo = await readPackageInfo(item);

  log(
    `queued ${product.sku} as ${item.id}; references=${packageInfo.sourceImageCount || 0}; remote=${packageInfo.remoteImageCount || 0}; variants=${packageInfo.variantCount || 0}`
  );

  const renderStartedAt = Date.now();
  await httpJson("/api/product-queue/start", {
    method: "POST",
    body: JSON.stringify({
      ...(imageflowPipeline ? { pipeline: imageflowPipeline } : {}),
      automation_mode: "cdp",
      queue_ids: [item.id],
      target_count: Number(job.requestedCount || 5)
    })
  }).catch((error) => {
    throw new Error(`Cannot start ImageFlow Pool Scheduler queue: ${error.message}`);
  });

  const finalPaths = await waitForFinalImages(item.id, Number(job.requestedCount || 5), renderStartedAt);
  await mkdir(outputDir, { recursive: true });
  await writeFile(
    path.join(outputDir, "manifest.json"),
    `${JSON.stringify(
      {
        source: "imageflow-local",
        queueId: item.id,
        productSku: product.sku,
        sourceImageCount: packageInfo.sourceImageCount || 0,
        remoteImageCount: packageInfo.remoteImageCount || 0,
        variantCount: packageInfo.variantCount || 0,
        productPackagePath: packageInfo.packagePath || "",
        images: finalPaths.map((file, index) => ({
          file,
          role: String(jobPrompt.frameSpec?.slots?.[index]?.role || "album_image"),
          prompt: {
            assetIndex: index,
            aspectRatio: job.targetAspectRatio || "4:5",
            productSku: product.sku,
            templateId: jobPrompt.templateId || null,
            templateBlueprint: jobPrompt.templateBlueprint || null,
            frameSpec: jobPrompt.frameSpec || null
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
