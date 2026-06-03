import type { ProductWithInventory } from "@/lib/ecommerce/types";
import { formatMoney } from "@/lib/money";
import type { LandingTemplate, LandingTemplateId } from "./types";

export const landingTemplates: LandingTemplate[] = [
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

function stockText(product: ProductWithInventory) {
  if (product.availableStock <= 0) return "Shop sẽ kiểm tồn trước khi chốt đơn";
  if (product.availableStock <= product.lowStockThreshold) return "Số lượng còn ít, nên nhắn shop kiểm mẫu ngay";
  return "Đang có hàng trong kho đồng bộ";
}

export function buildLandingContent(product: ProductWithInventory, templateId: LandingTemplateId) {
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
