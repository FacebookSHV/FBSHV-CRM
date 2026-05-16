import { getD1Database } from "@/lib/db";
import { generateAiText } from "@/lib/ai/provider";
import { deleteContentMediaForPost } from "@/lib/content-media";
import { getEcommerceProvider } from "@/lib/ecommerce/provider";
import type { ProductWithInventory } from "@/lib/ecommerce/types";
import { getFacebookStore } from "@/lib/facebook/store";
import { DEFAULT_WORKSPACE_ID } from "@/lib/facebook/types";

export const CONTENT_TEMPLATES = [
  "product_intro",
  "problem_solution",
  "feedback",
  "how_to_use",
  "comparison",
  "promotion",
  "livestream_reminder"
] as const;

export type ContentTemplate = (typeof CONTENT_TEMPLATES)[number];
export type ContentPostStatus = "draft" | "scheduled" | "published" | "failed" | "cancelled";

export type ContentPost = {
  id: string;
  workspaceId: string;
  pageId: string;
  productSku?: string | null;
  template: ContentTemplate;
  title: string;
  caption: string;
  cta: string;
  mediaSuggestion: string;
  scheduledAt?: string | null;
  status: ContentPostStatus;
  externalPostId?: string | null;
  error?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ContentIdea = Omit<ContentPost, "status" | "externalPostId" | "error" | "updatedAt">;
export type ContentIdeaWithAi = ContentIdea & {
  aiMode: "ai" | "template";
  aiNotice?: string;
};

type ContentPostRow = {
  id: string;
  workspace_id: string;
  page_id: string;
  product_sku: string | null;
  template: ContentTemplate;
  title: string;
  caption: string;
  cta: string;
  media_suggestion: string;
  scheduled_at: string | null;
  status: ContentPostStatus;
  external_post_id: string | null;
  error: string | null;
  created_at: string;
  updated_at: string;
};

const memoryPosts = new Map<string, ContentPost>();

function nowIso() {
  return new Date().toISOString();
}

function mapPost(row: ContentPostRow): ContentPost {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    pageId: row.page_id,
    productSku: row.product_sku,
    template: row.template,
    title: row.title,
    caption: row.caption,
    cta: row.cta,
    mediaSuggestion: row.media_suggestion,
    scheduledAt: row.scheduled_at,
    status: row.status,
    externalPostId: row.external_post_id,
    error: row.error,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function productCaption(product: ProductWithInventory, template: ContentTemplate) {
  const price = new Intl.NumberFormat("vi-VN").format(product.currentPrice);
  if (template === "problem_solution") {
    return `Nhà mình đang cần giải pháp gọn hơn? ${product.name} giúp xử lý nhu cầu hằng ngày với giá tham khảo ${price} ${product.currency}.`;
  }
  if (template === "how_to_use") {
    return `Cách dùng ${product.name}: kiểm tra đúng SKU ${product.sku}, chọn số lượng phù hợp rồi nhắn shop để được tư vấn trước khi chốt đơn.`;
  }
  if (template === "promotion") {
    return `${product.name} đang có giá ${price} ${product.currency}. Nhắn shop để kiểm tra tồn kho và ưu đãi mới nhất.`;
  }
  return `${product.name} hiện có trong danh mục Shop Huy Vân. Nhắn tin cho shop để kiểm tra tồn kho realtime và tư vấn mẫu phù hợp.`;
}

async function ideaFromProduct(product: ProductWithInventory, pageId: string, template: ContentTemplate): Promise<ContentIdeaWithAi> {
  const createdAt = nowIso();
  const ai = await generateAiText({
    task: "caption",
    product,
    prompt: `Tạo caption cho mẫu bài ${template}; CTA ngắn, không dùng emoji.`
  });
  return {
    id: crypto.randomUUID(),
    workspaceId: DEFAULT_WORKSPACE_ID,
    pageId,
    productSku: product.sku,
    template,
    title: `${product.name}`.slice(0, 96),
    caption: ai.text || productCaption(product, template),
    cta: "Nhắn tin cho shop",
    mediaSuggestion: product.imageUrl || "Dùng ảnh sản phẩm từ Web TMĐT",
    scheduledAt: null,
    createdAt,
    aiMode: ai.mode,
    aiNotice: ai.notice
  };
}

async function defaultPageId() {
  const pages = await (await getFacebookStore()).listPages();
  return pages[0]?.id ?? "page_unassigned";
}

export async function generateContentIdeas(limit = 7, pageId?: string) {
  const targetPageId = pageId || (await defaultPageId());
  const products = await getEcommerceProvider().getProducts({ limit });
  if (!products.success) return { success: false as const, error: products.error };
  const ideas = await Promise.all(
    products.data
      .slice(0, limit)
      .map((product, index) => ideaFromProduct(product, targetPageId, CONTENT_TEMPLATES[index % CONTENT_TEMPLATES.length]))
  );
  return { success: true as const, data: ideas };
}

export async function listContentPosts() {
  const db = await getD1Database();
  if (!db) return [...memoryPosts.values()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const rows = await db
    .prepare("select * from content_posts order by updated_at desc limit 100")
    .all<ContentPostRow>();
  return (rows.results ?? []).map(mapPost);
}

export async function createContentPost(input: Partial<ContentPost>) {
  const now = nowIso();
  const post: ContentPost = {
    id: input.id || crypto.randomUUID(),
    workspaceId: input.workspaceId || DEFAULT_WORKSPACE_ID,
    pageId: input.pageId || (await defaultPageId()),
    productSku: input.productSku ?? null,
    template: input.template || "product_intro",
    title: input.title || "Bài nháp sản phẩm",
    caption: input.caption || "Nhắn shop để được tư vấn sản phẩm phù hợp.",
    cta: input.cta || "Nhắn tin cho shop",
    mediaSuggestion: input.mediaSuggestion || "",
    scheduledAt: input.scheduledAt ?? null,
    status: input.status || "draft",
    externalPostId: input.externalPostId ?? null,
    error: input.error ?? null,
    createdAt: input.createdAt || now,
    updatedAt: now
  };

  const db = await getD1Database();
  if (!db) {
    memoryPosts.set(post.id, post);
    return post;
  }

  await db
    .prepare(
      `insert into content_posts
      (id, workspace_id, page_id, product_sku, template, title, caption, cta, media_suggestion, scheduled_at, status, external_post_id, error, created_at, updated_at)
      values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      on conflict(id) do update set title = excluded.title, caption = excluded.caption, cta = excluded.cta,
      media_suggestion = excluded.media_suggestion, scheduled_at = excluded.scheduled_at, status = excluded.status,
      error = excluded.error, updated_at = excluded.updated_at`
    )
    .bind(
      post.id,
      post.workspaceId,
      post.pageId,
      post.productSku ?? null,
      post.template,
      post.title,
      post.caption,
      post.cta,
      post.mediaSuggestion,
      post.scheduledAt ?? null,
      post.status,
      post.externalPostId ?? null,
      post.error ?? null,
      post.createdAt,
      post.updatedAt
    )
    .run();
  return post;
}

export async function updateContentPost(id: string, patch: Partial<ContentPost>) {
  const current = (await listContentPosts()).find((post) => post.id === id);
  if (!current) return null;
  return createContentPost({ ...current, ...patch, id, createdAt: current.createdAt });
}

export async function deleteContentPost(id: string) {
  const current = (await listContentPosts()).find((post) => post.id === id);
  if (!current) return { deleted: false as const, error: "CONTENT_POST_NOT_FOUND" };
  if (current.status !== "draft" && current.status !== "scheduled") {
    return { deleted: false as const, error: "CONTENT_POST_DELETE_NOT_ALLOWED" };
  }

  const db = await getD1Database();
  if (!db) {
    memoryPosts.delete(id);
    return { deleted: true as const };
  }

  // NEO: Chỉ xóa draft/scheduled trong CRM; không tự xóa bài đã publish trên Meta.
  await db.prepare("delete from content_publish_jobs where post_id = ?").bind(id).run();
  await db.prepare("delete from content_publish_logs where post_id = ?").bind(id).run();
  await db.prepare("delete from content_post_targets where post_id = ?").bind(id).run();
  await deleteContentMediaForPost(id);
  await db.prepare("delete from content_posts where id = ?").bind(id).run();
  return { deleted: true as const };
}

export function buildCalendarSuggestions(days = 7) {
  const start = new Date();
  return Array.from({ length: days }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    const template = CONTENT_TEMPLATES[index % CONTENT_TEMPLATES.length];
    return {
      date: date.toISOString().slice(0, 10),
      suggestedTemplate: template,
      theme:
        template === "promotion"
          ? "Ưu đãi và tồn kho"
          : template === "how_to_use"
            ? "Hướng dẫn dùng sản phẩm"
            : "Tư vấn sản phẩm theo nhu cầu khách"
    };
  });
}

export async function scheduleContentPost(id: string, scheduledAt: string) {
  return updateContentPost(id, { scheduledAt, status: "scheduled" });
}

export async function cancelContentPost(id: string) {
  return updateContentPost(id, { status: "cancelled" });
}

export function resetContentPlannerMemoryForTests() {
  memoryPosts.clear();
}
