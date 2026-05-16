import {
  BarChart3,
  Bot,
  Boxes,
  CalendarDays,
  ClipboardList,
  Gauge,
  History,
  Inbox,
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
  { href: "/reports", label: "Báo cáo", icon: BarChart3 },
  { href: "/settings", label: "Cài đặt", icon: Settings },
  { href: "/audit-logs", label: "Audit Log", icon: History }
] as const;

export const mobileNavItems = [
  navItems[0],
  navItems[2],
  navItems[4],
  navItems[5],
  { href: "/ai-assistant", label: "AI", icon: Sparkles }
] as const;
