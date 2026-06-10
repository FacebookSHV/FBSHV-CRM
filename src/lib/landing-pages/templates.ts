import type { ProductWithInventory } from "@/lib/ecommerce/types";
import { generateAiText } from "@/lib/ai/provider";
import { formatMoney } from "@/lib/money";
import { getLandingTemplate } from "./template-catalog";
import type { LandingHero, LandingSections, LandingSeo, LandingTemplateId } from "./types";

export const legacyLandingTemplates = [
  {
    id: "sales_fast",
    name: "Bán nhanh",
    description: "Theo kiểu conversion page: giá, lợi ích chính, bảo hành, CTA rõ.",
    bestFor: "Sản phẩm có giá tốt, dễ chốt qua inbox hoặc Zalo."
  },
  {
    id: "video_guide",
    name: "Hướng dẫn lắp đặt",
    description: "Tập trung cách dùng/cách lắp đặt, hợp sản phẩm điện nước gia dụng.",
    bestFor: "Dây sen, vòi sen, phụ kiện cần video thao tác thật."
  },
  {
    id: "compare",
    name: "So sánh chọn đúng loại",
    description: "Giúp khách hiểu vì sao nên chọn mẫu này thay vì mẫu rẻ hơn.",
    bestFor: "Sản phẩm có nhiều phiên bản, chất liệu, công suất hoặc combo."
  }
];

export { landingTemplates } from "./template-catalog";

function stockText(product: ProductWithInventory) {
  if (product.availableStock <= 0) return "Shop sẽ kiểm tồn trước khi chốt đơn";
  if (product.availableStock <= product.lowStockThreshold) return "Số lượng còn ít, nên nhắn shop kiểm mẫu ngay";
  return "Đang có hàng trong kho đồng bộ";
}

function productModel(product: ProductWithInventory) {
  const source = `${product.name} ${product.sku}`.toUpperCase();
  const match = source.match(/CS\s*300W\s*K268|K268|[A-Z]{1,6}\s*\d{2,4}W?\s*K?\d{2,4}/);
  return (match?.[0] || product.name || product.sku).replace(/\s+/g, " ").trim();
}

function isFanController(product: ProductWithInventory) {
  const source = `${product.name} ${product.sku} ${product.description} ${product.promptAssets?.promptText ?? ""}`.toLowerCase();
  return /cs\s*300w|k268|mạch|mach|remote|điều khiển quạt|dieu khien quat|quạt|quat/.test(source);
}

function fanControllerContent(product: ProductWithInventory): LandingContent {
  const name = product.name || product.sku;
  const model = productModel(product);
  const price = formatMoney(product.currentPrice || product.salePrice || product.originalPrice, product.currency);
  const stock = stockText(product);
  const baseSeo = {
    title: `${name} - bộ điều khiển quạt remote | Shop Huy Vân`,
    description: `${name} giá ${price}, gồm mạch điều khiển, bảng nút và remote. Nhắn shop kiểm đúng loại quạt trước khi lắp.`
  };

  return {
    hero: {
      headline: `${model} - bộ điều khiển quạt đủ mạch, bảng nút và remote`,
      subheadline: "Nâng cấp điều khiển quạt bằng remote/bảng nút, nhắn shop kiểm đúng loại quạt và cách lắp trước khi chốt đơn.",
      bullets: [`Giá tham khảo ${price}`, stock, "Gồm mạch đỏ, bảng nút bấm, remote và dây kết nối", "Tư vấn loại quạt có thể lắp trước khi mua"],
      primaryCta: "Nhắn shop kiểm mạch",
      secondaryCta: "Xem cách lắp"
    },
    sections: {
      trustBadges: ["Kiểm đúng mạch trước khi chốt", "Có remote và bảng nút", "Hỗ trợ tư vấn lắp đặt", "Dữ liệu từ sản phẩm thật"],
      benefits: [
        { title: "Điều khiển quạt tiện hơn", text: "Bộ sản phẩm tập trung cho nhu cầu điều khiển quạt bằng remote và bảng nút rời." },
        { title: "Kiểm đúng linh kiện", text: "Ảnh/prompt phải giữ đúng mạch đỏ thân ngang, bảng nút xanh, remote trắng và dây kết nối." },
        { title: "Đỡ mua nhầm mẫu", text: "Khách gửi ảnh quạt hoặc mạch cũ để shop kiểm nguồn, công suất và phương án lắp trước khi chốt." }
      ],
      steps: [
        { title: "Chụp quạt hoặc mạch cũ", text: "Gửi ảnh quạt, mạch đang dùng hoặc nhu cầu thay thế để shop kiểm đúng mẫu." },
        { title: "Đối chiếu nguồn/công suất", text: "Shop kiểm khả năng phù hợp với bộ điều khiển CS 300W K268 trước khi khách lắp." },
        { title: "Lắp mạch, bảng nút, remote", text: "Khi lắp cần đấu đúng dây, cố định bảng nút và test remote/bảng nút trước khi dùng lâu dài." },
        { title: "Test tốc độ quạt", text: "Kiểm các mức điều khiển, khoảng cách remote và độ ổn định sau khi lắp." }
      ],
      faq: [
        { question: "Bộ này lắp được cho loại quạt nào?", answer: "Cần kiểm nguồn, công suất và kiểu motor. Khách nên gửi ảnh quạt/mạch cũ để shop xác nhận trước khi mua." },
        { question: "Có đủ mạch, bảng nút và remote không?", answer: "Theo dữ liệu/ảnh sản phẩm hiện có, bộ gồm mạch điều khiển, bảng nút bấm, remote và dây kết nối." },
        { question: "Tự lắp được không?", answer: "Nếu không chắc dây nguồn hoặc motor, nên nhờ thợ điện. Shop hỗ trợ tư vấn sơ đồ theo ảnh thực tế của khách." }
      ],
      offerNote: "Để lại số điện thoại hoặc nhắn shop kèm ảnh quạt/mạch cũ, shop sẽ kiểm mẫu và tư vấn cách lắp trước khi chốt."
    },
    seo: baseSeo
  };
}

type LandingContent = {
  hero: LandingHero;
  sections: LandingSections;
  seo: LandingSeo;
};

type LandingContentWithAi = {
  content: LandingContent;
  aiMode: "ai" | "template";
  aiNotice?: string | null;
};

function cleanText(value: unknown, fallback: string, max = 220) {
  const text = typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
  return (text || fallback).slice(0, max);
}

function cleanTextList(value: unknown, fallback: string[], maxItems: number, maxLength = 140) {
  const source = Array.isArray(value) ? value : [];
  const items = source.map((item) => cleanText(item, "", maxLength)).filter(Boolean);
  return (items.length ? items : fallback).slice(0, maxItems);
}

function cleanCards(value: unknown, fallback: Array<{ title: string; text: string }>, maxItems: number) {
  const source = Array.isArray(value) ? value : [];
  const items = source
    .map((item) => ({
      title: cleanText((item as { title?: unknown })?.title, "", 80),
      text: cleanText((item as { text?: unknown })?.text, "", 220)
    }))
    .filter((item) => item.title && item.text);
  return (items.length ? items : fallback).slice(0, maxItems);
}

function cleanFaq(value: unknown, fallback: Array<{ question: string; answer: string }>) {
  const source = Array.isArray(value) ? value : [];
  const items = source
    .map((item) => ({
      question: cleanText((item as { question?: unknown })?.question, "", 120),
      answer: cleanText((item as { answer?: unknown })?.answer, "", 260)
    }))
    .filter((item) => item.question && item.answer);
  return (items.length ? items : fallback).slice(0, 4);
}

function extractJsonObject(text: string) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  const source = fenced || text;
  const start = source.indexOf("{");
  const end = source.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(source.slice(start, end + 1)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function unescapeAiJsonText(value: string) {
  try {
    return JSON.parse(`"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`) as string;
  } catch {
    return value;
  }
}

function matchJsonString(text: string, key: string) {
  const match = text.match(new RegExp(`"${key}"\\s*:\\s*"([^"\\r\\n]{4,240})"?`, "i"));
  return match?.[1] ? unescapeAiJsonText(match[1]) : "";
}

function contentFromPartialAiText(text: string, fallback: LandingContent): LandingContent | null {
  const headline = cleanText(matchJsonString(text, "headline"), "", 96);
  if (!headline) return null;
  const subheadline = cleanText(matchJsonString(text, "subheadline"), fallback.hero.subheadline, 220);
  const primaryCta = cleanText(matchJsonString(text, "primaryCta"), fallback.hero.primaryCta, 32);
  const secondaryCta = cleanText(matchJsonString(text, "secondaryCta"), fallback.hero.secondaryCta, 40);
  return {
    ...fallback,
    hero: {
      ...fallback.hero,
      headline,
      subheadline,
      primaryCta,
      secondaryCta
    }
  };
}

function normalizeAiLandingContent(raw: Record<string, unknown>, fallback: LandingContent): LandingContent {
  const hero = (raw.hero ?? {}) as Record<string, unknown>;
  const sections = (raw.sections ?? {}) as Record<string, unknown>;
  const seo = (raw.seo ?? {}) as Record<string, unknown>;
  return {
    hero: {
      headline: cleanText(hero.headline, fallback.hero.headline, 96),
      subheadline: cleanText(hero.subheadline, fallback.hero.subheadline, 220),
      bullets: cleanTextList(hero.bullets, fallback.hero.bullets, 4, 120),
      primaryCta: cleanText(hero.primaryCta, fallback.hero.primaryCta, 32),
      secondaryCta: cleanText(hero.secondaryCta, fallback.hero.secondaryCta, 40)
    },
    sections: {
      trustBadges: cleanTextList(sections.trustBadges, fallback.sections.trustBadges, 4, 48),
      benefits: cleanCards(sections.benefits, fallback.sections.benefits, 3),
      steps: cleanCards(sections.steps, fallback.sections.steps, 3),
      faq: cleanFaq(sections.faq, fallback.sections.faq),
      offerNote: cleanText(sections.offerNote, fallback.sections.offerNote, 220)
    },
    seo: {
      title: cleanText(seo.title, fallback.seo.title, 80),
      description: cleanText(seo.description, fallback.seo.description, 170)
    }
  };
}

function enforceProductHeadline(content: LandingContent, product: ProductWithInventory, fallback: LandingContent) {
  const model = productModel(product).toLowerCase();
  const headline = content.hero.headline.toLowerCase();
  if (model && !headline.includes(model)) {
    return {
      ...content,
      hero: {
        ...content.hero,
        headline: fallback.hero.headline,
        subheadline: content.hero.subheadline || fallback.hero.subheadline
      },
      seo: {
        title: fallback.seo.title,
        description: content.seo.description || fallback.seo.description
      }
    };
  }
  return content;
}

function landingAiPrompt(product: ProductWithInventory, templateId: LandingTemplateId) {
  const template = getLandingTemplate(templateId);
  const imageUrls = [...new Set([...(product.images ?? []), product.imageUrl].filter(Boolean))].slice(0, 8);
  const model = productModel(product);
  const fanRules = isFanController(product)
    ? [
        "QUY TAC RIENG CHO BO DIEU KHIEN QUAT:",
        "- San pham la bo dieu khien quat, khong viet thanh nguon dien chung, den, o cam, bo kich, hay thiet bi du an.",
        "- Ten/SEO/headline phai giu model CS 300W K268 hoac ten san pham goc.",
        "- Noi dung can nhac ro gom mach dieu khien mau do, bang nut bam mau xanh, remote mau trang va day ket noi.",
        "- Neu viet ve loai quat co the lap, phai ghi can shop kiem nguon/cong suat/kieu motor truoc khi chot, khong cam ket lap moi loai quat."
      ].join("\n")
    : "";
  return [
    "Tạo nội dung landing page bán hàng cho sản phẩm gia dụng/điện nước Shop Huy Vân.",
    "Mục tiêu: kích thích người mua nhắn tư vấn hoặc mua ngay, có hook nỗi đau, lợi ích rõ, không khô như template.",
    "Viết tiếng Việt tự nhiên, có dấu, không dùng emoji, không bịa bảo hành/thông số nếu dữ liệu không có.",
    "Không dùng claim tuyệt đối như tốt nhất, rẻ nhất, chữa khỏi, cam kết 100%.",
    `Template: ${template.name} (${template.id})`,
    `Góc chuyển đổi: ${template.copyAngle}`,
    `Phong cách hình ảnh/giao diện: ${template.visualStyle}`,
    `Các khối chuyển đổi cần giữ nếu có dữ liệu thật: ${template.conversionBlocks.join(", ")}`,
    "Bắt buộc: giảm giá, lượt bán, đánh giá, đếm ngược và lời chứng thực là thành phần quan trọng nhưng chỉ được ghi giá trị khi dữ liệu nguồn thật cung cấp.",
    "Nếu chưa có dữ liệu thật cho một khối social proof, hãy viết copy trung tính để UI ẩn khối đó; không tạo số, tên khách hoặc thời hạn mẫu.",
    `Tên sản phẩm: ${product.name}`,
    `Model/SKU cần giữ trong headline SEO: ${model}`,
    `SKU: ${product.sku}`,
    `Giá hiện tại: ${formatMoney(product.currentPrice || product.salePrice || product.originalPrice, product.currency)}`,
    `Tồn khả dụng: ${product.availableStock}`,
    product.description ? `Mô tả nguồn: ${product.description}` : "Mô tả nguồn đang rỗng, hãy viết dựa trên tên/SKU/ảnh, không bịa thông số.",
    product.promptAssets?.promptText ? `Product Core promptAssets.promptText:\n${product.promptAssets.promptText}` : "",
    fanRules,
    imageUrls.length ? `Ảnh sản phẩm thật:\n${imageUrls.map((url, index) => `${index + 1}. ${url}`).join("\n")}` : "",
    "Chỉ trả JSON hợp lệ, không markdown, không giải thích. Trả một object JSON ngắn, không xuống dòng dài.",
    `Schema:
{
  "hero": {
    "headline": "tối đa 96 ký tự",
    "subheadline": "1 câu bán hàng rõ pain/benefit",
    "bullets": ["3-4 bullet ngắn"],
    "primaryCta": "Mua ngay",
    "secondaryCta": "Xem lý do nên mua"
  },
  "sections": {
    "trustBadges": ["3-4 badge ngắn"],
    "benefits": [{"title":"", "text":""}],
    "steps": [{"title":"", "text":""}],
    "faq": [{"question":"", "answer":""}],
    "offerNote": "1 câu nhắc khách để lại số điện thoại/nhắn shop"
  },
  "seo": {"title":"", "description":""}
}`
  ].filter(Boolean).join("\n");
}

export async function buildLandingContentWithAi(product: ProductWithInventory, templateId: LandingTemplateId): Promise<LandingContentWithAi> {
  const fallback = buildLandingContent(product, templateId);
  const ai = await generateAiText({
    task: "caption",
    product,
    prompt: landingAiPrompt(product, templateId)
  });
  if (ai.mode !== "ai") return { content: fallback, aiMode: "template", aiNotice: ai.notice };
  const parsed = extractJsonObject(ai.text);
  if (!parsed) {
    const partial = contentFromPartialAiText(ai.text, fallback);
    if (partial) {
      return { content: enforceProductHeadline(partial, product, fallback), aiMode: "ai", aiNotice: `${ai.notice ?? "AI thật"}; JSON chưa hoàn chỉnh nên CRM đã dùng phần headline/subheadline đọc được.` };
    }
    return { content: fallback, aiMode: "template", aiNotice: "AI trả nội dung không phải JSON hợp lệ, đã dùng template an toàn." };
  }
  return { content: enforceProductHeadline(normalizeAiLandingContent(parsed, fallback), product, fallback), aiMode: "ai", aiNotice: ai.notice };
}

export function buildLandingContent(product: ProductWithInventory, templateId: LandingTemplateId) {
  if (isFanController(product)) return fanControllerContent(product);

  const name = product.name || product.sku;
  const price = formatMoney(product.currentPrice || product.salePrice || product.originalPrice, product.currency);
  const stock = stockText(product);
  const baseSeo = {
    title: `${name} | Shop Huy Vân`,
    description: `${name} giá ${price}, tư vấn nhanh, dữ liệu sản phẩm đồng bộ từ Web Quản Lý TMĐT.`
  };

  if (templateId === "video_guide") {
    return {
      hero: {
        headline: `Tự lắp ${name} tại nhà dễ hơn bạn nghĩ`,
        subheadline: "Xem thao tác, kiểm đúng mẫu và nhắn shop để được tư vấn trước khi mua.",
        bullets: ["Hướng dẫn từng bước", stock, "Tư vấn đúng nhu cầu sử dụng"],
        primaryCta: "Nhận tư vấn lắp đặt",
        secondaryCta: "Xem cách dùng"
      },
      sections: {
        trustBadges: ["Tư vấn đúng mẫu", "Kiểm tồn realtime", "Hỗ trợ sau mua"],
        benefits: [
          { title: "Dễ hiểu trước khi mua", text: "Trang tập trung vào cách dùng và cách lắp để khách tự tin đặt hàng." },
          { title: "Giảm hỏi lại nhiều lần", text: "Các câu hỏi thường gặp được trả lời ngay trong landing page." },
          { title: "Phù hợp chạy video ads", text: "CTA dẫn khách từ video quảng cáo sang trang có cùng mạch hướng dẫn." }
        ],
        steps: [
          { title: "Kiểm mẫu đang dùng", text: "Chụp hoặc mô tả vị trí lắp để shop tư vấn đúng chuẩn." },
          { title: "Chọn sản phẩm phù hợp", text: `${name} đang hiển thị giá tham khảo ${price}.` },
          { title: "Nhắn shop xác nhận", text: "Shop kiểm tồn, phí giao và hướng dẫn trước khi chốt đơn." }
        ],
        faq: [
          { question: "Có cần thợ lắp không?", answer: "Shop sẽ tư vấn theo tình trạng thực tế. Nếu thao tác đơn giản, khách có thể tự làm theo hướng dẫn." },
          { question: "Giá trên trang có phải giá cuối không?", answer: "Giá lấy từ dữ liệu đồng bộ, shop vẫn kiểm lại trước khi chốt đơn." }
        ],
        offerNote: "Phù hợp chạy quảng cáo dạng video thao tác thật kèm phụ đề rõ."
      },
      seo: baseSeo
    };
  }

  if (templateId === "compare") {
    return {
      hero: {
        headline: `Chọn đúng ${name}, tránh mua nhầm mẫu không hợp`,
        subheadline: "So sánh nhanh theo độ bền, nhu cầu sử dụng và ngân sách trước khi nhắn shop.",
        bullets: ["So sánh lợi ích rõ ràng", `Giá tham khảo ${price}`, stock],
        primaryCta: "Nhờ shop tư vấn",
        secondaryCta: "Xem so sánh"
      },
      sections: {
        trustBadges: ["Không tư vấn đại trà", "Có dữ liệu sản phẩm thật", "Ưu tiên mẫu phù hợp"],
        benefits: [
          { title: "Biết vì sao đáng mua", text: "Tập trung vào khác biệt chất lượng thay vì chỉ nhìn giá." },
          { title: "Giảm rủi ro mua sai", text: "Khách có thể gửi nhu cầu để shop xác nhận trước." },
          { title: "Dễ tạo nhiều variant A/B", text: "Có thể thử angle giá, chất lượng hoặc hướng dẫn sử dụng." }
        ],
        steps: [
          { title: "Nói nhu cầu", text: "Khách gửi nhu cầu, vị trí dùng hoặc ngân sách." },
          { title: "Shop đối chiếu sản phẩm", text: "CRM dùng sản phẩm đã sync để tư vấn mẫu thật." },
          { title: "Chốt mẫu phù hợp", text: "Gửi link, báo giá và xác nhận tồn trước khi tạo đơn." }
        ],
        faq: [
          { question: "Mẫu này khác mẫu rẻ hơn ở đâu?", answer: "Landing page nhấn vào độ bền, tính phù hợp và hỗ trợ sau mua. Shop có thể bổ sung bảng so sánh chi tiết theo từng sản phẩm." },
          { question: "Có thể tạo variant khác để test không?", answer: "Có. Nền dữ liệu đã có bảng variant để mở rộng A/B testing sau." }
        ],
        offerNote: "Phù hợp sản phẩm có nhiều phiên bản hoặc cần giải thích trước khi khách mua."
      },
      seo: baseSeo
    };
  }

  return {
    hero: {
      headline: `${name} - giá tốt, tư vấn nhanh, giao hàng linh hoạt`,
      subheadline: "Trang bán hàng gọn, tập trung vào lợi ích, giá và nút nhắn shop để chốt nhanh.",
      bullets: [`Giá tham khảo ${price}`, stock, "Dữ liệu lấy từ sản phẩm đã đồng bộ"],
      primaryCta: "Mua ngay",
      secondaryCta: "Xem chi tiết"
    },
    sections: {
      trustBadges: ["Kiểm tồn trước khi chốt", "Hàng từ Shop Huy Vân", "Hỗ trợ tư vấn nhanh"],
      benefits: [
        { title: "Giá rõ ngay đầu trang", text: "Khách thấy giá và ưu điểm chính trước khi phải kéo nhiều." },
        { title: "CTA dễ bấm trên mobile", text: "Nút mua/nhắn tư vấn được giữ nổi để tăng chuyển đổi." },
        { title: "Dùng được cho Ads", text: "URL landing page có thể gắn trực tiếp vào quảng cáo Meta." }
      ],
      steps: [
        { title: "Xem sản phẩm", text: `Kiểm thông tin ${name}, SKU ${product.sku}.` },
        { title: "Nhắn shop", text: "Gửi nhu cầu, số lượng và khu vực nhận hàng." },
        { title: "Shop xác nhận", text: "Shop kiểm giá/tồn realtime trước khi tạo đơn." }
      ],
      faq: [
        { question: "Dữ liệu sản phẩm lấy từ đâu?", answer: "Từ cache sản phẩm đã đồng bộ trong CRM từ Web Quản Lý TMĐT." },
        { question: "Bấm mua có trừ tồn ngay không?", answer: "Không. CRM chỉ tạo lead/liên hệ, tồn chỉ xử lý khi API ngoài xác nhận." }
      ],
      offerNote: "Phù hợp chạy quảng cáo chuyển đổi thấp rủi ro trong 7 ngày đầu."
    },
    seo: baseSeo
  };
}
