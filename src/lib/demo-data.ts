export const dashboardMetrics = [
  { label: "Doanh thu hôm nay", value: "12,8 triệu", helper: "+18% so với hôm qua" },
  { label: "Hội thoại cần xử lý", value: "23", helper: "7 hội thoại ưu tiên cao" },
  { label: "Đơn chờ xác nhận", value: "14", helper: "Đã kiểm tồn realtime" },
  { label: "ROAS quảng cáo", value: "4,2x", helper: "Theo dữ liệu kiểm thử 7 ngày" }
];

export const demoProducts = [
  {
    id: "prod-crm-001",
    sku: "CRM_TEST_001",
    name: "Sản phẩm test CRM",
    category: "Thiết bị thông minh",
    costPrice: 7000,
    originalPrice: 12000,
    salePrice: 10000,
    currentPrice: 10000,
    discountAmount: 2000,
    discountPercent: 16.7,
    currency: "VND",
    imageUrl: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64",
    description: "Sản phẩm kiểm thử dùng để kiểm tra đồng bộ, giá SKU và tồn kho.",
    status: "active",
    stock: 100,
    availableStock: 92,
    reservedStock: 8,
    lowStockThreshold: 10,
    priceUpdatedAt: "2026-05-15T03:00:00.000Z",
    syncedAt: "2026-05-15T04:00:00.000Z"
  },
  {
    id: "prod-crm-002",
    sku: "SHV_LED_WIFI",
    name: "Đèn LED Wi-Fi đổi màu",
    category: "Đèn thông minh",
    costPrice: 42000,
    originalPrice: 89000,
    salePrice: 69000,
    currentPrice: 69000,
    discountAmount: 20000,
    discountPercent: 22.5,
    currency: "VND",
    imageUrl: "https://images.unsplash.com/photo-1507473885765-e6ed057f782c",
    description: "Đèn LED điều khiển qua app, phù hợp nội dung livestream.",
    status: "active",
    stock: 46,
    availableStock: 40,
    reservedStock: 6,
    lowStockThreshold: 12,
    priceUpdatedAt: "2026-05-14T09:30:00.000Z",
    syncedAt: "2026-05-15T02:30:00.000Z"
  },
  {
    id: "prod-crm-003",
    sku: "SHV_CAM_MINI",
    name: "Camera mini trong nhà",
    category: "Camera",
    costPrice: 185000,
    originalPrice: 299000,
    salePrice: 259000,
    currentPrice: 259000,
    discountAmount: 40000,
    discountPercent: 13.4,
    currency: "VND",
    imageUrl: "https://images.unsplash.com/photo-1587614295999-6c1c136751e1",
    description: "Camera nhỏ gọn, có chế độ cảnh báo chuyển động.",
    status: "low_stock",
    stock: 7,
    availableStock: 5,
    reservedStock: 2,
    lowStockThreshold: 10,
    priceUpdatedAt: "2026-05-13T11:00:00.000Z",
    syncedAt: "2026-05-15T01:00:00.000Z"
  }
];

export const moduleSummaries = {
  fanpages: {
    title: "Fanpage",
    subtitle: "Kết nối trang, theo dõi trạng thái token và phân quyền phản hồi.",
    rows: ["Shop Huy Vân", "Thiết bị nhà thông minh", "Sale cuối tuần"]
  },
  inbox: {
    title: "Inbox/Comment",
    subtitle: "Gom hội thoại, bình luận và ngữ cảnh sản phẩm để xử lý nhanh.",
    rows: ["Khách hỏi camera mini", "Khách cần kiểm giá đèn Wi-Fi", "Bình luận cần ẩn số điện thoại"]
  },
  crm: {
    title: "CRM",
    subtitle: "Quản lý khách hàng, tag, lịch sử tương tác và điểm ưu tiên.",
    rows: ["Nguyễn Minh Anh", "Trần Gia Bảo", "Lê Thanh Hằng"]
  },
  ads: {
    title: "Facebook Ads",
    subtitle: "Theo dõi chiến dịch, nhóm quảng cáo, creative và chỉ số ngày.",
    rows: ["Remarketing camera", "Livestream đèn thông minh", "Tệp khách đã nhắn tin"]
  },
  automation: {
    title: "Automation",
    subtitle: "Tạo quy tắc chăm sóc, nhắc xử lý hội thoại và cảnh báo tồn thấp.",
    rows: ["Nhắc đơn chưa chốt", "Cảnh báo tồn thấp", "Gửi tag khách tiềm năng"]
  },
  reports: {
    title: "Báo cáo",
    subtitle: "Tổng hợp doanh thu, tốc độ xử lý inbox và hiệu quả quảng cáo.",
    rows: ["Doanh thu theo ngày", "Hiệu suất nhân viên", "ROAS theo chiến dịch"]
  },
  settings: {
    title: "Cài đặt",
    subtitle: "Quản lý tích hợp Facebook, Telegram, Zalo, TMĐT và secret placeholder.",
    rows: ["Facebook/Meta status", "AI Providers", "Web Quản Lý TMĐT status"]
  },
  auditLogs: {
    title: "Audit Log",
    subtitle: "Lưu lại hành động quan trọng, đồng bộ sản phẩm và webhook TMĐT.",
    rows: ["Đồng bộ sản phẩm", "Kiểm tồn realtime", "Webhook inventory.updated"]
  }
};

export const orderStatuses = [
  { code: "pending", label: "Chờ xác nhận", tone: "warning" },
  { code: "reserved", label: "Đã giữ hàng", tone: "info" },
  { code: "confirmed", label: "Đã tạo đơn ngoài", tone: "success" }
] as const;
