import { generateAiText } from "@/lib/ai/provider";
import { createImageflowJob } from "@/lib/imageflow/store";
import { getEcommerceProviderAsync } from "@/lib/ecommerce/provider";
import { readCachedProducts } from "@/lib/ecommerce/cache";
import type { ProductWithInventory } from "@/lib/ecommerce/types";
import { createPublishJobs, publishDueContentJobs } from "@/lib/content-publishing";
import { createContentPost, listContentPosts, updateContentPost, type ContentPost, type ContentTemplate } from "@/lib/content-planner";
import { getFacebookStore } from "@/lib/facebook/store";
import type { FacebookPageRecord } from "@/lib/facebook/types";

type AutoContentMode = "auto_safe" | "hold_for_review" | "blocked";

type PlannedSlot = {
  pageId: string;
  pageName: string;
  time: string;
  template: ContentTemplate;
  objective: string;
};

export type AutoContentRunResult = {
  date: string;
  mode: "scheduled" | "dry_run";
  pages: Array<{ id: string; name: string }>;
  created: Array<{
    post: ContentPost;
    productSku: string;
    pageName: string;
    scheduledAt: string;
    imageflowJobId?: string;
    safety: AutoContentMode;
    aiMode: "ai" | "template";
  }>;
  held: Array<{ productSku?: string; pageName?: string; reason: string; safety: AutoContentMode }>;
  publishDue: Awaited<ReturnType<typeof publishDueContentJobs>>;
};

const TARGET_PAGE_NAMES = ["Shop Huy Vân", "Kho Gia Dụng Huy Vân"];

const DAILY_SLOTS: Array<Omit<PlannedSlot, "pageId" | "pageName"> & { pageName: string }> = [
  { pageName: "Shop Huy Vân", time: "08:10", template: "problem_solution", objective: "Bài nỗi đau và giải pháp để kéo inbox" },
  { pageName: "Shop Huy Vân", time: "19:45", template: "promotion", objective: "Bài bán hàng mạnh nhất trong ngày" },
  { pageName: "Kho Gia Dụng Huy Vân", time: "09:00", template: "product_intro", objective: "Bài hàng kho thật, ưu tiên tồn nhiều" },
  { pageName: "Kho Gia Dụng Huy Vân", time: "20:30", template: "comparison", objective: "Bài so sánh/chọn đúng loại để chốt đơn" }
];

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function todayBangkok() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
}

function bangkokTimeToIso(date: string, time: string) {
  return new Date(`${date}T${time}:00+07:00`).toISOString();
}

function currency(value: number, unit = "VND") {
  return `${new Intl.NumberFormat("vi-VN").format(value)} ${unit}`;
}

function imageCount(product: ProductWithInventory) {
  return new Set([product.imageUrl, ...(product.images ?? []), ...((product.promptAssets?.allImageUrls ?? []) as string[])]).size;
}

function scoreProduct(product: ProductWithInventory, recentPosts: ContentPost[]) {
  if (product.status === "inactive" || product.availableStock <= 0) return -9999;
  const recentCount = recentPosts.filter((post) => post.productSku === product.sku).length;
  const stockScore = Math.min(product.availableStock, 250) * 2;
  const imageScore = Math.min(imageCount(product), 8) * 12;
  const descScore = product.description.length > 120 ? 30 : product.description.length > 40 ? 12 : 0;
  const discountScore = Math.min(product.discountPercent || 0, 30);
  const lowStockPenalty = product.availableStock <= product.lowStockThreshold ? 80 : 0;
  const repeatPenalty = recentCount * 55;
  return stockScore + imageScore + descScore + discountScore - lowStockPenalty - repeatPenalty;
}

function assessSafety(product: ProductWithInventory): { mode: AutoContentMode; reason: string } {
  if (product.availableStock <= 0 || product.status === "inactive") return { mode: "blocked", reason: "Hết hàng hoặc inactive" };
  if (imageCount(product) < 2) return { mode: "hold_for_review", reason: "Thiếu ảnh tham chiếu để render album an toàn" };
  if (product.availableStock <= product.lowStockThreshold) return { mode: "hold_for_review", reason: "Tồn thấp, không tự đăng dày" };
  if (!product.description && !(product.promptAssets?.promptText)) return { mode: "hold_for_review", reason: "Thiếu mô tả/promptAssets sản phẩm" };
  return { mode: "auto_safe", reason: "Đủ tồn, đủ ảnh và đủ ngữ cảnh sản phẩm" };
}

function captionFallback(product: ProductWithInventory, slot: PlannedSlot) {
  const price = currency(product.currentPrice, product.currency);
  const stockLine = product.availableStock > 0 ? `Hàng đang có trong kho, shop kiểm đúng SKU ${product.sku} trước khi chốt.` : "";
  if (slot.template === "problem_solution") {
    return `Bạn đang cần chọn đúng món gia dụng cho nhu cầu hằng ngày?\n\n${product.name} là lựa chọn đáng cân nhắc khi cần hàng có sẵn, rõ SKU và được tư vấn trước khi mua.\n\nGiá tham khảo: ${price}\n${stockLine}\n\nNhắn Shop Huy Vân để shop kiểm mẫu, số lượng và phương án dùng phù hợp.`;
  }
  if (slot.template === "comparison") {
    return `Đừng chọn theo cảm tính nếu chưa kiểm đúng nhu cầu.\n\nVới ${product.name}, shop sẽ kiểm SKU ${product.sku}, tồn kho và thông tin sản phẩm trước khi tư vấn.\n\nGiá tham khảo: ${price}\n${stockLine}\n\nInbox để được gợi ý đúng loại, tránh mua nhầm.`;
  }
  if (slot.template === "promotion") {
    return `${product.name}\n\nGiá hôm nay: ${price}\n${stockLine}\n\nSản phẩm được lấy từ dữ liệu đồng bộ thật của shop. Nhắn tin để kiểm tồn và ưu đãi hiện tại trước khi chốt đơn.`;
  }
  return `${product.name}\n\nSKU: ${product.sku}\nGiá tham khảo: ${price}\n${stockLine}\n\nKho Gia Dụng Huy Vân ưu tiên hàng có sẵn, kiểm mẫu trước khi báo khách.`;
}

function buildPrompt(product: ProductWithInventory, slot: PlannedSlot) {
  return [
    `Tạo caption Facebook bán hàng cho fanpage "${slot.pageName}".`,
    `Mục tiêu bài: ${slot.objective}.`,
    `Sản phẩm: ${product.name}. SKU: ${product.sku}.`,
    `Giá: ${currency(product.currentPrice, product.currency)}. Tồn khả dụng: ${product.availableStock}.`,
    `Mô tả nguồn: ${product.description || product.promptAssets?.promptText || "Không có mô tả dài."}`,
    "Yêu cầu: viết tiếng Việt tự nhiên, có hook nỗi đau hoặc lợi ích cụ thể, CTA inbox rõ, không emoji.",
    "Không được bịa lượt bán, review, testimonial, countdown, bảo hành, thông số kỹ thuật nếu dữ liệu nguồn không có.",
    "Caption phải đi cùng album ảnh 4:5 do ImageFlow render, nên có nội dung khớp từng ảnh: hero, pain point, lợi ích, hướng dẫn/so sánh, CTA."
  ].join("\n");
}

function imageflowBrief(product: ProductWithInventory, slot: PlannedSlot) {
  return {
    source: "auto_daily_facebook_content",
    pageName: slot.pageName,
    objective: slot.objective,
    captionContext: {
      productName: product.name,
      sku: product.sku,
      price: product.currentPrice,
      currency: product.currency,
      stock: product.availableStock,
      description: product.description,
      promptAssets: product.promptAssets
    },
    claimPolicy: {
      allowOnlyRealData: true,
      forbidden: ["luot_ban_gia", "review_gia", "testimonial_gia", "countdown_gia", "thong_so_ky_thuat_bia"]
    },
    imageSlots: [
      { role: "hero", purpose: "Ảnh mở đầu gây chú ý, thấy sản phẩm thật, tên ngắn và lợi ích chính" },
      { role: "pain", purpose: "Nêu vấn đề khách gặp trước khi mua" },
      { role: "benefit", purpose: "Lợi ích rõ, chỉ dùng thông tin có trong Product Core" },
      { role: "guide", purpose: "Hướng dẫn dùng/lắp/chọn đúng loại nếu dữ liệu sản phẩm hỗ trợ" },
      { role: "cta", purpose: "Ảnh chốt đơn, giá thật, SKU thật, CTA inbox" }
    ]
  };
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "AUTO_CONTENT_SLOT_FAILED";
}

async function loadProducts(limit: number) {
  const cached = await readCachedProducts({ limit });
  if (cached.length > 0) return cached;
  const external = await (await getEcommerceProviderAsync()).getProducts({ limit });
  return external.success ? external.data : [];
}

async function targetPages() {
  const pages = (await (await getFacebookStore()).listPages()).filter((page) => page.tokenStatus === "valid" || page.status === "connected");
  const selected: FacebookPageRecord[] = [];
  for (const name of TARGET_PAGE_NAMES) {
    const match = pages.find((page) => normalizeText(page.name).includes(normalizeText(name)));
    if (match) selected.push(match);
  }
  return selected.length > 0 ? selected : pages.slice(0, 2);
}

function buildSlots(pages: FacebookPageRecord[]) {
  const matched = DAILY_SLOTS.flatMap((slot) => {
    const page = pages.find((item) => normalizeText(item.name).includes(normalizeText(slot.pageName)));
    return page ? [{ ...slot, pageId: page.id, pageName: page.name }] : [];
  });
  if (matched.length > 0) return matched;
  return DAILY_SLOTS.flatMap((slot, index) => {
    const page = pages[Math.floor(index / 2)] ?? pages[0];
    return page ? [{ ...slot, pageId: page.id, pageName: page.name }] : [];
  });
}

export async function runDailyFacebookContentAutomation(input: { date?: string; limit?: number; dryRun?: boolean } = {}): Promise<AutoContentRunResult> {
  const date = input.date || todayBangkok();
  const pages = await targetPages();
  const slots = buildSlots(pages);
  const existingPosts = await listContentPosts();
  const products = await loadProducts(input.limit ?? 80);
  const candidates = products
    .map((product) => ({ product, score: scoreProduct(product, existingPosts) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);

  const created: AutoContentRunResult["created"] = [];
  const held: AutoContentRunResult["held"] = [];
  const usedSkus = new Set<string>();

  for (const slot of slots) {
    const scheduledAt = bangkokTimeToIso(date, slot.time);
    if (existingPosts.some((post) => post.pageId === slot.pageId && post.scheduledAt === scheduledAt)) {
      held.push({ pageName: slot.pageName, reason: `Đã có bài ở slot ${slot.time}`, safety: "hold_for_review" });
      continue;
    }
    const selected = candidates.find((item) => !usedSkus.has(item.product.sku));
    if (!selected) {
      held.push({ pageName: slot.pageName, reason: "Không còn sản phẩm đủ điểm để xếp lịch", safety: "blocked" });
      continue;
    }
    usedSkus.add(selected.product.sku);
    const safety = assessSafety(selected.product);
    if (safety.mode !== "auto_safe") {
      held.push({ productSku: selected.product.sku, pageName: slot.pageName, reason: safety.reason, safety: safety.mode });
      continue;
    }

    const ai = await generateAiText({ task: "caption", product: selected.product, prompt: buildPrompt(selected.product, slot) });
    const caption = ai.text || captionFallback(selected.product, slot);
    const post = await createContentPost({
      pageId: slot.pageId,
      productSku: selected.product.sku,
      template: slot.template,
      title: selected.product.name.slice(0, 96),
      caption,
      cta: "Nhắn tin cho shop",
      mediaSuggestion: `ImageFlow Facebook Ads album 4:5 - ${slot.objective}`,
      scheduledAt,
      status: input.dryRun ? "draft" : "scheduled"
    });

    const imageJob = input.dryRun
      ? null
      : await createImageflowJob({
          postId: post.id,
          productSku: selected.product.sku,
          title: `Facebook album ${slot.pageName} - ${selected.product.name}`,
          targetFormat: "facebook_feed",
          targetAspectRatio: "4:5",
          outputWidth: 1080,
          outputHeight: 1350,
          requestedCount: 5,
          promptJson: imageflowBrief(selected.product, slot)
        }).catch(async (error) => {
          const reason = `IMAGEFLOW_JOB_CREATE_FAILED: ${errorMessage(error)}`;
          await updateContentPost(post.id, { status: "draft", error: reason });
          held.push({ productSku: selected.product.sku, pageName: slot.pageName, reason, safety: "hold_for_review" });
          return null;
        });
    if (!input.dryRun && !imageJob) {
      continue;
    }
    if (!input.dryRun) {
      await createPublishJobs({ postId: post.id, pageIds: [slot.pageId], scheduledAt, publishNow: false });
    }
    created.push({
      post,
      productSku: selected.product.sku,
      pageName: slot.pageName,
      scheduledAt,
      imageflowJobId: imageJob?.id,
      safety: safety.mode,
      aiMode: ai.mode
    });
  }

  return {
    date,
    mode: input.dryRun ? "dry_run" : "scheduled",
    pages: pages.map((page) => ({ id: page.id, name: page.name })),
    created,
    held,
    publishDue: await publishDueContentJobs({ limit: 20 })
  };
}
