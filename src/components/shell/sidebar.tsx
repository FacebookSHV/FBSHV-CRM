"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { navItems } from "./nav-items";

type SidebarProps = {
  open?: boolean;
  onClose?: () => void;
};

export function Sidebar({ open = true, onClose }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className={[
        "fixed inset-y-0 left-0 z-40 w-72 border-r border-slate-200 bg-white transition-transform lg:translate-x-0",
        open ? "translate-x-0" : "-translate-x-full"
      ].join(" ")}
      aria-label="Điều hướng chính"
    >
      <div className="flex h-full flex-col">
        <div className="border-b border-slate-200 px-5 py-4">
          <div className="text-lg font-semibold text-ink">FBSHV CRM</div>
          <div className="mt-1 text-xs text-slate-500">Facebook sales hub</div>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active =
              pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={[
                  "flex min-h-11 items-center gap-3 rounded-md px-3 text-sm font-medium transition focus-ring",
                  active
                    ? "bg-brand-50 text-brand-700"
                    : "text-slate-600 hover:bg-slate-100 hover:text-ink"
                ].join(" ")}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-slate-200 px-5 py-4 text-xs text-slate-500">
          Workspace: Shop Huy Vân
        </div>
      </div>
    </aside>
  );
}
