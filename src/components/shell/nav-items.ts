import {
  BarChart3,
  Bot,
  Boxes,
  Cable,
  CalendarDays,
  ClipboardList,
  Gauge,
  History,
  Inbox,
  ListChecks,
  LayoutTemplate,
  Megaphone,
  SearchCheck,
  Settings,
  Share2,
  Sparkles,
  Users,
  Workflow
} from "lucide-react";

export const navItems = [
  { href: "/dashboard", label: "Tổng quan", icon: Gauge },
  { href: "/fanpages", label: "Fanpage", icon: Share2 },
  { href: "/inbox", label: "Inbox/Comment", icon: Inbox },
  { href: "/page-audit", label: "Page Audit", icon: SearchCheck },
  { href: "/content-planner", label: "Lịch nội dung", icon: CalendarDays },
  { href: "/crm", label: "CRM", icon: Users },
  { href: "/orders", label: "Đơn hàng", icon: ClipboardList },
  { href: "/products", label: "Sản phẩm đồng bộ", icon: Boxes },
  { href: "/ads", label: "Facebook Ads", icon: Megaphone },
  { href: "/automation", label: "Automation", icon: Workflow },
  { href: "/ai-assistant", label: "AI Assistant", icon: Bot },
  { href: "/landing-pages", label: "Landing Page", icon: LayoutTemplate },
  { href: "/imageflow-bridge", label: "Cầu nối ảnh AI", icon: Cable },
  { href: "/reports", label: "Báo cáo", icon: BarChart3 },
  { href: "/settings", label: "Cài đặt", icon: Settings },
  { href: "/settings/integration-jobs", label: "Tiến trình đồng bộ", icon: ListChecks },
  { href: "/audit-logs", label: "Audit Log", icon: History }
] as const;

export const navGroups = [
  {
    label: "Vận hành",
    items: [navItems[0], navItems[2], navItems[4], navItems[5], navItems[6]]
  },
  {
    label: "Dữ liệu",
    items: [navItems[7], navItems[1], navItems[3]]
  },
  {
    label: "Tăng trưởng",
    items: [navItems[8], navItems[9], navItems[10], navItems[11], navItems[12], navItems[13]]
  },
  {
    label: "Hệ thống",
    items: [navItems[14], navItems[15], navItems[16]]
  }
] as const;

export const mobileNavItems = [
  navItems[0],
  navItems[2],
  navItems[4],
  navItems[5],
  { href: "/ai-assistant", label: "AI", icon: Sparkles }
] as const;
