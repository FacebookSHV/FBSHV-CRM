import { getD1Database } from "@/lib/db";
import { readCachedProductBySku } from "@/lib/ecommerce/cache";
import { DEFAULT_WORKSPACE_ID } from "@/lib/facebook/types";
import { createImageflowJob } from "@/lib/imageflow/store";
import { sendMetaConversionEvent } from "@/lib/meta/conversions";
import { buildTemplateFrameSpec, getLandingTemplate } from "./template-catalog";
import { buildLandingContent, buildLandingContentWithAi, landingTemplates } from "./templates";
import type { LandingPage, LandingPageStatus, LandingTemplateId, LandingVariant } from "./types";

type LandingPageRow = {
  id: string;
  workspace_id: string;
  slug: string;
  title: string;
  product_sku: string;
  template_id: LandingTemplateId;
  status: LandingPageStatus;
  hero_json: string;
  sections_json: string;
  seo_json: string;
  created_at: string;
  updated_at: string;
  published_at: string | null;
  views?: number | null;
  leads?: number | null;
  contacts?: number | null;
};

type VariantRow = {
  id: string;
  variant_key: string;
  name: string;
  weight: number;
  template_id: LandingTemplateId;
  content_json: string;
};

function nowIso() {
  return new Date().toISOString();
}

function appBaseUrl() {
  return process.env.NEXT_PUBLIC_APP_URL || "https://fbshv-crm.ngchihuy.workers.dev";
}

function safeJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function stringify(value: unknown) {
  try {
    return JSON.stringify(value ?? {});
  } catch {
    return "{}";
  }
}

function slugify(value: string) {
  const normalized = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized || `lp-${crypto.randomUUID().slice(0, 8)}`;
}

const landingImageFrameSpec = {
  output: { aspectRatio: "4:5", width: 1080, height: 1350, count: 5 },
  safeArea: {
    contentInsetPercent: 8,
    noTextWithinPercentFromEdge: 10,
    keepMainProductInsidePercent: 88
  },
  slots: [
    {
      index: 0,
      role: "mobile_hero",
      frame: "4:5 hero card",
      instruction: "Ảnh chính phải vừa khít khung hero 4:5, sản phẩm nằm giữa, không cắt mất nhãn quan trọng."
    },
    {
      index: 1,
      role: "price_offer_card",
      frame: "4:5 product offer",
      instruction: "Có khoảng trống an toàn cho giá/CTA, không đặt chữ sát mép, không làm sản phẩm nhỏ quá."
    },
    {
      index: 2,
      role: "benefit_card",
      frame: "4:5 benefit proof",
      instruction: "Tập trung lợi ích chính, sản phẩm rõ, nền sạch, đọc được trên màn hình điện thoại."
    },
    {
      index: 3,
      role: "how_to_use_card",
      frame: "4:5 usage step",
      instruction: "Thể hiện thao tác sử dụng/lắp đặt, bố cục thoáng, không crop tay hoặc sản phẩm."
    },
    {
      index: 4,
      role: "trust_card",
      frame: "4:5 trust proof",
      instruction: "Ảnh chốt niềm tin: hàng thật, đóng gói hoặc ứng dụng thực tế, không nhồi quá nhiều chữ."
    }
  ],
  negativePrompt: [
    "Không tạo ảnh ngang hoặc vuông.",
    "Không để chữ, logo, giá hoặc sản phẩm chạm mép khung.",
    "Không crop mất sản phẩm chính.",
    "Không dùng chữ nhỏ dày đặc khó đọc trên mobile.",
    "Không tạo poster lộn xộn nhiều mảng cảnh báo."
  ]
};

function isFanControllerProduct(productName: string, sku: string) {
  return /cs\s*300w|k268|mạch|mach|remote|điều khiển quạt|dieu khien quat|quạt|quat/i.test(`${productName} ${sku}`);
}

function buildLandingImageBrief(
  product: { name: string; sku: string },
  content: { hero: unknown; sections: unknown; seo: unknown },
  templateId: LandingTemplateId
) {
  const fanController = isFanControllerProduct(product.name, product.sku);
  const template = getLandingTemplate(templateId);
  return {
    template: {
      id: template.id,
      name: template.name,
      visualStyle: template.visualStyle,
      copyAngle: template.copyAngle,
      conversionBlocks: template.conversionBlocks,
      imageSlots: template.imageSlots
    },
    productLock: {
      productName: product.name,
      sku: product.sku,
      mustKeepExactProductIdentity: true,
      seoTitleMustContain: product.name,
      doNotRenameAs: ["nguồn điện dự án", "ổ cắm", "đèn", "bộ kích điện", "hộp nguồn chung"]
    },
    referenceImagePolicy: [
      "Use all local source_images from product_package.json together as the source of truth.",
      "Do not redesign the board, remote, button panel, cable, color, printed markings, component positions, or proportions.",
      "If there is only one upstream product image, use that exact source photo as the product layer in each frame; create callouts, arrows, badges, crop/zoom panels, and background layout around it, but do not redraw a new PCB, new remote, or new button panel.",
      "Reject any generated frame that changes the PCB component layout, remote button count/layout, button-panel color/layout, or turns the kit into another K268/K269/K64-style controller."
    ],
    requiredAlbumSlots: fanController
      ? [
          "1. Hero kit: use the exact source product photo to show the complete CS 300W K268 kit: red circuit board, blue button panel, white remote and cable.",
          "2. Circuit board proof: crop/zoom the exact source PCB; it must stay horizontally long/wide like the reference, not shortened, redrawn, cropped into a square, or replaced by another board.",
          "3. Installation guide: use the exact source product photo plus safe generic callouts/step labels around it; do not invent impossible wiring or a different board.",
          "4. Compatible fan check: use icons/silhouettes or simple fan category cards around the exact source product photo; do not show a different controller kit. Mention ceiling fan, wall fan, ventilation fan and water-cooling/industrial fan as items to check before buying.",
          "5. Offer/trust frame: use the exact source product photo with price/stock/consultation CTA and exact product name; no fake reviews or fake sold count."
        ]
      : [
          "1. Hero product frame with exact product identity.",
          "2. Feature proof frame using close-up reference details.",
          "3. How-to-use or installation guide if the product requires setup.",
          "4. Fit/compatibility/use-case frame based only on product data.",
          "5. Offer/trust frame using real price/stock data only."
        ],
    landingCopy: content
  };
}

function sanitizeError(error: unknown) {
  const message = error instanceof Error ? error.message : "Không gửi được CAPI.";
  return message.replace(/[A-Za-z0-9_-]{32,}/g, (value) => `${value.slice(0, 6)}...${value.slice(-4)}`);
}

async function readDefaultVariant(landingPageId: string): Promise<LandingVariant | null> {
  const db = await getD1Database();
  if (!db) return null;
  const row = await db
    .prepare("select id, variant_key, name, weight, template_id, content_json from landing_page_variants where landing_page_id = ? and status = 'active' order by variant_key asc limit 1")
    .bind(landingPageId)
    .first<VariantRow>();
  if (!row) return null;
  const content = safeJson(row.content_json, { hero: {}, sections: {}, seo: {} }) as LandingVariant["content"];
  return {
    id: row.id,
    variantKey: row.variant_key,
    name: row.name,
    weight: row.weight,
    templateId: row.template_id,
    content
  };
}

async function readLandingCreativeImages(landingPageId: string) {
  const db = await getD1Database();
  if (!db) return [] as string[];
  const rows = await db
    .prepare(
      `select a.public_url as public_url
       from imageflow_jobs j
       join imageflow_assets a on a.job_id = j.id and a.workspace_id = j.workspace_id
       where j.workspace_id = ?
         and j.status in ('completed', 'needs_user')
         and a.status = 'approved'
         and a.public_url is not null
         and j.post_id = ?
       order by
         j.updated_at desc,
         a.asset_index asc
       limit 8`
    )
    .bind(DEFAULT_WORKSPACE_ID, landingPageId)
    .all<{ public_url: string }>();
  return [...new Set((rows.results ?? []).map((row) => row.public_url).filter(Boolean))];
}

async function mapLandingPage(row: LandingPageRow): Promise<LandingPage> {
  const [product, variant, creativeImages] = await Promise.all([
    readCachedProductBySku(row.product_sku),
    readDefaultVariant(row.id),
    readLandingCreativeImages(row.id)
  ]);
  const generated = product ? buildLandingContent(product, row.template_id) : null;
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    productSku: row.product_sku,
    templateId: row.template_id,
    status: row.status,
    hero: safeJson(row.hero_json, variant?.content.hero ?? generated?.hero ?? {
      headline: row.title,
      subheadline: "Sản phẩm này cần được đồng bộ lại để hiển thị đủ dữ liệu.",
      bullets: ["Dữ liệu đang lấy từ bản lưu landing page"],
      primaryCta: "Nhắn shop tư vấn",
      secondaryCta: "Xem chi tiết"
    }),
    sections: safeJson(row.sections_json, variant?.content.sections ?? generated?.sections ?? {
      trustBadges: ["Dữ liệu đã lưu"],
      benefits: [],
      steps: [],
      faq: [],
      offerNote: "Hãy đồng bộ lại sản phẩm nếu cần cập nhật giá, ảnh hoặc tồn."
    }),
    seo: safeJson(row.seo_json, variant?.content.seo ?? generated?.seo ?? { title: row.title, description: row.title }),
    product,
    variant,
    creativeImages,
    publicUrl: `${appBaseUrl()}/lp/${row.slug}`,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    publishedAt: row.published_at,
    metrics: {
      views: Number(row.views ?? 0),
      leads: Number(row.leads ?? 0),
      contacts: Number(row.contacts ?? 0)
    }
  };
}

export function listLandingTemplates() {
  return landingTemplates;
}

export async function listLandingPages() {
  const db = await getD1Database();
  if (!db) return [] as LandingPage[];
  const rows = await db
    .prepare(
      `select lp.*,
        sum(case when e.event_name = 'PageView' then 1 else 0 end) as views,
        sum(case when e.event_name = 'Lead' then 1 else 0 end) as leads,
        sum(case when e.event_name = 'Contact' then 1 else 0 end) as contacts
       from landing_pages lp
       left join landing_page_events e on e.landing_page_id = lp.id
       where lp.workspace_id = ?
       group by lp.id
       order by lp.updated_at desc`
    )
    .bind(DEFAULT_WORKSPACE_ID)
    .all<LandingPageRow>();
  return Promise.all((rows.results ?? []).map(mapLandingPage));
}

export async function getLandingPageBySlug(slug: string) {
  const db = await getD1Database();
  if (!db) return null;
  const row = await db
    .prepare("select * from landing_pages where workspace_id = ? and slug = ? and status = 'published' limit 1")
    .bind(DEFAULT_WORKSPACE_ID, slug)
    .first<LandingPageRow>();
  return row ? mapLandingPage(row) : null;
}

export async function createLandingPage(input: { productSku: string; templateId: LandingTemplateId; title?: string; createAiImages?: boolean }) {
  const db = await getD1Database();
  if (!db) throw new Error("BLOCKED_BY_MISSING_BINDING: Thiếu D1 binding để lưu landing page.");
  const product = await readCachedProductBySku(input.productSku);
  if (!product) throw new Error("LANDING_PRODUCT_NOT_FOUND: Cần đồng bộ sản phẩm thật trước khi tạo landing page.");
  const template = landingTemplates.find((item) => item.id === input.templateId);
  if (!template) throw new Error("LANDING_TEMPLATE_NOT_FOUND: Mẫu landing page không hợp lệ.");

  const id = crypto.randomUUID();
  const variantId = crypto.randomUUID();
  const now = nowIso();
  const generated = await buildLandingContentWithAi(product, input.templateId);
  const content = generated.content;
  const title = input.title?.trim() || content.seo.title;
  const slug = `${slugify(product.name)}-${input.templateId.replaceAll("_", "-")}`.slice(0, 90);

  // NEO: Landing page chỉ tạo từ Product cache thật đã sync, không tự bịa sản phẩm hoặc tồn kho.
  await db
    .prepare(
      `insert into landing_pages
      (id, workspace_id, slug, title, product_sku, template_id, status, hero_json, sections_json, seo_json, created_at, updated_at)
      values (?, ?, ?, ?, ?, ?, 'draft', ?, ?, ?, ?, ?)`
    )
    .bind(id, DEFAULT_WORKSPACE_ID, `${slug}-${id.slice(0, 6)}`, title, product.sku, input.templateId, stringify(content.hero), stringify(content.sections), stringify(content.seo), now, now)
    .run();

  await db
    .prepare(
      `insert into landing_page_variants
      (id, workspace_id, landing_page_id, variant_key, name, weight, template_id, content_json, status, created_at, updated_at)
      values (?, ?, ?, 'A', ?, 100, ?, ?, 'active', ?, ?)`
    )
    .bind(variantId, DEFAULT_WORKSPACE_ID, id, `${template.name} - Variant A`, input.templateId, stringify(content), now, now)
    .run();

  let imageJobQueued = false;
  let imageJobError: string | null = null;
  if (input.createAiImages !== false) {
    try {
      const templateFrameSpec = buildTemplateFrameSpec(input.templateId);
      // NEO: Landing page xếp job ImageFlow từ Product Core thật để hero/gallery có ảnh AI 4:5, không dùng ảnh giả.
      await createImageflowJob({
        postId: id,
        productSku: product.sku,
        title: `Landing AI - ${product.name}`,
        targetFormat: "landing_page",
        targetAspectRatio: "4:5",
        outputWidth: 1080,
        outputHeight: 1350,
        requestedCount: 5,
        promptJson: {
          channel: "landing_page",
          creativeGoal: "Tạo bộ ảnh bán hàng gia dụng dùng cho hero, gallery và quảng cáo Facebook.",
          imageStyle: "ảnh sản phẩm rõ, sạch, ánh sáng thương mại, có bối cảnh sử dụng thực tế, không chữ nhỏ khó đọc",
          requiredRatio: "4:5",
          templateId: input.templateId,
          templateBlueprint: {
            name: template.name,
            accent: template.accent,
            visualStyle: template.visualStyle,
            copyAngle: template.copyAngle,
            conversionBlocks: template.conversionBlocks,
            imageSlots: template.imageSlots
          },
          frameSpec: {
            ...landingImageFrameSpec,
            ...templateFrameSpec,
            output: { ...landingImageFrameSpec.output, ...templateFrameSpec.output },
            safeArea: { ...landingImageFrameSpec.safeArea, ...templateFrameSpec.safeArea }
          },
          productSku: product.sku,
          sourceData: "Product Core detail + landing copy",
          landingCopy: {
            hero: content.hero,
            sections: content.sections,
            seo: content.seo
          },
          creativeBrief: buildLandingImageBrief(product, {
            hero: content.hero,
            sections: content.sections,
            seo: content.seo
          }, input.templateId)
        }
      });
      imageJobQueued = true;
    } catch (error) {
      imageJobError = sanitizeError(error);
    }
  }

  const pages = await listLandingPages();
  const page = pages.find((item) => item.id === id)!;
  return { ...page, imageJobQueued, imageJobError, aiMode: generated.aiMode, aiNotice: generated.aiNotice };
}

export async function updateLandingPageStatus(id: string, status: LandingPageStatus) {
  const db = await getD1Database();
  if (!db) throw new Error("BLOCKED_BY_MISSING_BINDING: Thiếu D1 binding để cập nhật landing page.");
  const now = nowIso();
  await db
    .prepare("update landing_pages set status = ?, updated_at = ?, published_at = case when ? = 'published' then ? else published_at end where workspace_id = ? and id = ?")
    .bind(status, now, status, now, DEFAULT_WORKSPACE_ID, id)
    .run();
  return listLandingPages();
}

export async function recordLandingPageEvent(input: {
  landingPageId: string;
  variantId?: string | null;
  eventName: "PageView" | "Lead" | "Contact" | "ViewContent";
  eventId?: string;
  visitorId?: string;
  sourceUrl?: string;
  email?: string;
  phone?: string;
  name?: string;
  value?: number;
  currency?: string;
  contentName?: string;
  contentIds?: string[];
}) {
  const db = await getD1Database();
  if (!db) throw new Error("BLOCKED_BY_MISSING_BINDING: Thiếu D1 binding để lưu landing event.");
  const eventId = input.eventId?.trim() || crypto.randomUUID();
  const page = await db.prepare("select id, title from landing_pages where id = ?").bind(input.landingPageId).first<{ id: string; title: string }>();
  if (!page) throw new Error("LANDING_PAGE_NOT_FOUND: Không tìm thấy landing page.");

  let capiStatus = "not_sent";
  let capiError: string | null = null;
  try {
    await sendMetaConversionEvent({
      eventName: input.eventName,
      eventId,
      eventSourceUrl: input.sourceUrl,
      email: input.email,
      phone: input.phone,
      value: input.value,
      currency: input.currency,
      contentName: input.contentName || page.title,
      contentIds: input.contentIds
    });
    capiStatus = "sent";
  } catch (error) {
    capiStatus = "failed";
    capiError = sanitizeError(error);
  }

  await db
    .prepare(
      `insert into landing_page_events
      (id, workspace_id, landing_page_id, variant_id, event_id, event_name, visitor_id, source_url,
       user_data_json, custom_data_json, capi_status, capi_error, created_at)
      values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      on conflict(event_id) do nothing`
    )
    .bind(
      crypto.randomUUID(),
      DEFAULT_WORKSPACE_ID,
      input.landingPageId,
      input.variantId ?? null,
      eventId,
      input.eventName,
      input.visitorId ?? null,
      input.sourceUrl ?? null,
      stringify({ email: Boolean(input.email), phone: Boolean(input.phone), name: input.name || null }),
      stringify({ value: input.value ?? null, currency: input.currency ?? null, contentIds: input.contentIds ?? [] }),
      capiStatus,
      capiError,
      nowIso()
    )
    .run();

  return { eventId, capiStatus, capiError };
}
