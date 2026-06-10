import type { LandingTemplate, LandingTemplateId } from "./types";

export const landingTemplateIds = [
  "sales_fast",
  "video_guide",
  "compare",
  "tiktok_shop",
  "shopee_shop",
  "facebook_ads",
  "livestream_deal",
  "combo_saver",
  "flash_sale",
  "trust_builder",
  "brand_story",
  "minimal_clean",
  "bold_impact"
] as const satisfies readonly LandingTemplateId[];

const baseSlots: LandingTemplate["imageSlots"] = [
  {
    index: 0,
    role: "hero",
    label: "Ảnh hero",
    width: 1080,
    height: 1350,
    ratio: "4:5",
    instruction: "Giữ đúng sản phẩm thật, khung bán hàng nổi bật, có vùng an toàn cho headline và giá."
  },
  {
    index: 1,
    role: "problem_solution",
    label: "Nỗi đau và giải pháp",
    width: 1080,
    height: 1350,
    ratio: "4:5",
    instruction: "Minh họa vấn đề khách gặp và cách sản phẩm giải quyết, không bịa công dụng."
  },
  {
    index: 2,
    role: "feature_proof",
    label: "Chi tiết tính năng",
    width: 1080,
    height: 1350,
    ratio: "4:5",
    instruction: "Cận cảnh chi tiết thật từ ảnh tham chiếu, có callout ngắn, không vẽ lại sản phẩm."
  },
  {
    index: 3,
    role: "installation",
    label: "Hướng dẫn sử dụng/lắp đặt",
    width: 1080,
    height: 1350,
    ratio: "4:5",
    instruction: "Bố cục từng bước dễ hiểu trên mobile; nếu thiếu dữ liệu chỉ dùng chỉ dẫn an toàn, không bịa sơ đồ."
  },
  {
    index: 4,
    role: "offer_proof",
    label: "Ưu đãi và niềm tin",
    width: 1080,
    height: 1350,
    ratio: "4:5",
    instruction: "Dùng giá, giảm giá, tồn, đánh giá và lượt bán thật nếu nguồn có; tuyệt đối không tạo số giả."
  }
];

function template(
  value: Omit<LandingTemplate, "imageSlots"> & { slotOverrides?: Partial<LandingTemplate["imageSlots"][number]>[] }
): LandingTemplate {
  const overrides = value.slotOverrides ?? [];
  return {
    ...value,
    imageSlots: baseSlots.map((slot) => ({ ...slot, ...(overrides.find((item) => item.index === slot.index) ?? {}) }))
  };
}

// NEO: Catalog chuyển đổi lấy ý tưởng từ các mẫu user cung cấp nhưng chỉ hiển thị social proof thật.
export const landingTemplates: LandingTemplate[] = [
  template({
    id: "sales_fast",
    name: "Bán nhanh",
    group: "conversion",
    accent: "#e11d48",
    description: "Giá, ưu đãi, lợi ích chính và CTA đặt ở vùng nhìn đầu tiên.",
    bestFor: "Sản phẩm có giá tốt, cần chốt qua inbox hoặc số điện thoại.",
    visualStyle: "Commerce gọn, tương phản cao, CTA đỏ hồng.",
    copyAngle: "Hook nỗi đau trực diện, giải pháp ngắn, ưu đãi và lý do chốt ngay.",
    conversionBlocks: ["Giảm giá thật", "Tồn kho thật", "Lượt quan tâm thật", "CTA mua/tư vấn"]
  }),
  template({
    id: "video_guide",
    name: "Hướng dẫn lắp đặt",
    group: "conversion",
    accent: "#0f766e",
    description: "Ưu tiên video, ảnh từng bước và lỗi thường gặp.",
    bestFor: "Thiết bị điện nước, phụ kiện cần hướng dẫn thao tác.",
    visualStyle: "Hướng dẫn kỹ thuật sáng, sạch, dễ đọc.",
    copyAngle: "Giảm nỗi lo lắp sai, chỉ rõ điều kiện phù hợp và bước sử dụng.",
    conversionBlocks: ["Các bước lắp", "Lỗi thường gặp", "Tư vấn tương thích", "CTA gửi ảnh thực tế"],
    slotOverrides: [{ index: 1, role: "compatibility", label: "Kiểm tra tương thích" }]
  }),
  template({
    id: "compare",
    name: "So sánh chọn đúng loại",
    group: "conversion",
    accent: "#2563eb",
    description: "So sánh phiên bản, công suất, chất liệu và tình huống sử dụng.",
    bestFor: "Sản phẩm có nhiều phiên bản hoặc khách thường mua nhầm.",
    visualStyle: "Bảng so sánh rõ, xanh dương tin cậy.",
    copyAngle: "Nêu chi phí của việc mua sai rồi hướng khách đến lựa chọn phù hợp.",
    conversionBlocks: ["Bảng so sánh", "Điểm khác biệt", "Tư vấn chọn mẫu", "CTA xác nhận SKU"]
  }),
  template({
    id: "tiktok_shop",
    name: "TikTok Shop",
    group: "marketplace",
    accent: "#ef174f",
    description: "Nhịp nhanh, video proof, deal nổi bật và CTA liên tục.",
    bestFor: "Traffic từ video ngắn, creator hoặc chiến dịch khám phá sản phẩm.",
    visualStyle: "Đen, trắng, đỏ hồng; bố cục nhanh và mạnh.",
    copyAngle: "Hook 3 giây, tình huống dùng thật, kết quả dễ hình dung.",
    conversionBlocks: ["Video/ảnh proof", "Deal thật", "Lượt bán thật", "Review thật", "CTA sticky"]
  }),
  template({
    id: "shopee_shop",
    name: "Shopee Commerce",
    group: "marketplace",
    accent: "#ee4d2d",
    description: "Giá sale, voucher thật, đánh giá thật, lượt bán thật và thông tin giao hàng.",
    bestFor: "Khách quen hành vi xem giá và social proof kiểu marketplace.",
    visualStyle: "Cam thương mại, thông tin dày vừa phải, quét nhanh.",
    copyAngle: "Làm rõ giá trị nhận được, mức tiết kiệm và bằng chứng mua hàng.",
    conversionBlocks: ["Giá gốc/sale", "Voucher thật", "Rating thật", "Đã bán thật", "Giao hàng"]
  }),
  template({
    id: "facebook_ads",
    name: "Facebook Ads",
    group: "marketplace",
    accent: "#1877f2",
    description: "Hook nỗi đau, before/after có căn cứ và form nhận tư vấn.",
    bestFor: "Traffic quảng cáo Meta cần chuyển đổi sang lead hoặc tin nhắn.",
    visualStyle: "Xanh Facebook, proof rõ, form ngắn.",
    copyAngle: "Nỗi đau cụ thể, cơ chế giải quyết, proof và CTA để lại thông tin.",
    conversionBlocks: ["Hook Ads", "Before/after thật", "Bình luận/review thật", "Form lead", "Pixel/CAPI"]
  }),
  template({
    id: "livestream_deal",
    name: "Livestream Deal",
    group: "marketplace",
    accent: "#dc2626",
    description: "Deal theo phiên live, quà tặng và thời gian kết thúc thật.",
    bestFor: "Chiến dịch livestream có lịch bắt đầu/kết thúc rõ.",
    visualStyle: "Nền tối, đỏ nổi bật, thông tin khẩn cấp có kiểm chứng.",
    copyAngle: "Lý do xem/mua trong phiên live, quà và giới hạn thật.",
    conversionBlocks: ["Thời gian live thật", "Countdown thật", "Giá live thật", "Quà tặng thật", "CTA nhắc lịch"]
  }),
  template({
    id: "combo_saver",
    name: "Combo tiết kiệm",
    group: "marketplace",
    accent: "#059669",
    description: "Giải thích từng món trong combo và số tiền tiết kiệm thật.",
    bestFor: "Bộ sản phẩm, phụ kiện đi kèm hoặc bán chéo nhiều SKU.",
    visualStyle: "Xanh lá, nhóm sản phẩm rõ, tổng giá dễ so sánh.",
    copyAngle: "Nêu đủ bộ giúp tránh mua thiếu và tiết kiệm bao nhiêu dựa trên giá thật.",
    conversionBlocks: ["Thành phần combo", "Giá lẻ/tổng", "Tiết kiệm thật", "Tồn từng SKU", "CTA mua bộ"]
  }),
  template({
    id: "flash_sale",
    name: "Flash Sale",
    group: "conversion",
    accent: "#e11d48",
    description: "Ưu đãi theo chiến dịch và bộ đếm kết thúc từ mốc thời gian thật.",
    bestFor: "Khuyến mãi có thời hạn, tồn giới hạn hoặc chiến dịch ngắn.",
    visualStyle: "Tương phản cao, giá lớn, nhịp gấp nhưng không gây hiểu nhầm.",
    copyAngle: "Giải thích rõ ưu đãi, điều kiện và thời hạn thật.",
    conversionBlocks: ["Giảm giá thật", "Countdown thật", "Tồn thật", "Điều kiện ưu đãi", "CTA chốt"]
  }),
  template({
    id: "trust_builder",
    name: "Xây dựng niềm tin",
    group: "conversion",
    accent: "#0f766e",
    description: "Đánh giá, lượt bán, ảnh khách dùng và chính sách từ nguồn thật.",
    bestFor: "Sản phẩm cần nhiều bằng chứng trước khi khách quyết định.",
    visualStyle: "Sạch, chắc chắn, nhiều proof nhưng không nhồi.",
    copyAngle: "Giải tỏa rủi ro bằng dữ liệu, chính sách và trải nghiệm khách thật.",
    conversionBlocks: ["Rating thật", "Review thật", "Lượt bán thật", "Ảnh khách thật", "Chính sách thật"]
  }),
  template({
    id: "brand_story",
    name: "Câu chuyện thương hiệu",
    group: "story",
    accent: "#9f1239",
    description: "Kể nguồn gốc, tiêu chuẩn chọn hàng và cách shop hỗ trợ khách.",
    bestFor: "Sản phẩm cần cảm xúc, thương hiệu hoặc định vị chất lượng.",
    visualStyle: "Editorial hiện đại, ảnh lớn, nhịp kể chuyện.",
    copyAngle: "Kết nối vấn đề của khách với lý do sản phẩm được chọn và phục vụ.",
    conversionBlocks: ["Câu chuyện thật", "Quy trình thật", "Proof thật", "CTA tư vấn"]
  }),
  template({
    id: "minimal_clean",
    name: "Tối giản cao cấp",
    group: "story",
    accent: "#111827",
    description: "Ảnh sản phẩm lớn, chữ ít và tập trung vào chi tiết thiết kế.",
    bestFor: "Sản phẩm có ảnh đẹp, hình dáng tốt hoặc phân khúc cao hơn.",
    visualStyle: "Trắng, đen, khoảng thở lớn, ảnh chiếm ưu thế.",
    copyAngle: "Một lời hứa rõ, ba lợi ích chính và proof vừa đủ.",
    conversionBlocks: ["Ảnh hero lớn", "Chi tiết vật liệu", "Proof thật", "CTA tinh gọn"]
  }),
  template({
    id: "bold_impact",
    name: "Bold Impact",
    group: "story",
    accent: "#b91c1c",
    description: "Headline lớn, tương phản mạnh và nhịp section dứt khoát.",
    bestFor: "Sản phẩm có lợi ích nổi bật, cần tạo ấn tượng ngay.",
    visualStyle: "Đỏ, đen, trắng; typography đậm và ảnh cận cảnh.",
    copyAngle: "Hook mạnh nhưng đúng dữ liệu, mô tả kết quả sử dụng cụ thể.",
    conversionBlocks: ["Hook lớn", "Lợi ích chính", "Proof thật", "Ưu đãi thật", "CTA mạnh"]
  })
];

export function getLandingTemplate(templateId: LandingTemplateId) {
  return landingTemplates.find((item) => item.id === templateId) ?? landingTemplates[0];
}

export function buildTemplateFrameSpec(templateId: LandingTemplateId) {
  const selected = getLandingTemplate(templateId);
  return {
    templateId: selected.id,
    templateName: selected.name,
    output: { aspectRatio: "4:5", width: 1080, height: 1350, count: selected.imageSlots.length },
    visualStyle: selected.visualStyle,
    copyAngle: selected.copyAngle,
    conversionBlocks: selected.conversionBlocks,
    safeArea: {
      contentInsetPercent: 8,
      noTextWithinPercentFromEdge: 10,
      keepMainProductInsidePercent: 88
    },
    slots: selected.imageSlots,
    proofPolicy: {
      requiredSources: ["Product Core", "CRM landing metrics", "campaign configuration"],
      keepWhenReal: ["discount", "soldCount", "rating", "reviews", "countdown", "testimonials"],
      neverInvent: true
    },
    negativePrompt: [
      "Không tạo ảnh ngang hoặc vuông.",
      "Không thay đổi hình dáng, màu, nhãn, linh kiện hoặc phụ kiện của sản phẩm thật.",
      "Không bịa số lượt bán, đánh giá, review, voucher, quà tặng hoặc thời hạn khuyến mãi.",
      "Không đặt chữ, logo, giá hoặc sản phẩm sát mép khung.",
      "Không dùng chữ nhỏ dày đặc khó đọc trên điện thoại."
    ]
  };
}
