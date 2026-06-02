"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { navGroups } from "./nav-items";

type SidebarProps = {
  open?: boolean;
  onClose?: () => void;
};

export function Sidebar({ open = true, onClose }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className={[
        "fixed inset-y-0 left-0 z-40 w-72 border-r border-white/10 bg-[#08111f] text-slate-100 shadow-2xl shadow-slate-950/20 transition-transform md:translate-x-0",
        open ? "translate-x-0" : "-translate-x-full"
      ].join(" ")}
      aria-label="Điều hướng chính"
    >
      <div className="flex h-full flex-col">
        <div className="border-b border-white/10 px-5 py-5">
          <div className="rounded-lg border border-white/10 bg-white/[0.06] p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-lg font-bold text-white">FBSHV CRM</div>
                <div className="mt-1 text-xs text-slate-300">Meta sales console</div>
              </div>
              <span className="rounded-full bg-emerald-400/15 px-2.5 py-1 text-[11px] font-bold uppercase text-emerald-300 ring-1 ring-emerald-300/20">
                Live
              </span>
            </div>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {navGroups.map((group) => (
            <div key={group.label} className="mb-5 last:mb-0">
              <div className="mb-2 px-3 text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500">
                {group.label}
              </div>
              <div className="space-y-1">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active =
                    pathname === item.href || pathname.startsWith(`${item.href}/`);

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onClose}
                      className={[
                        "flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 focus:ring-offset-[#08111f]",
                        active
                          ? "bg-white text-slate-950 shadow-sm"
                          : "text-slate-300 hover:bg-white/[0.08] hover:text-white"
                      ].join(" ")}
                    >
                      <Icon className="h-4 w-4 flex-none" aria-hidden="true" />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
        <div className="border-t border-white/10 px-5 py-4">
          <div className="rounded-lg bg-white/[0.04] px-3 py-3 text-xs leading-5 text-slate-300">
            <div className="font-semibold text-white">Shop Huy Vân</div>
            <div className="mt-1">Dữ liệu thật từ Meta, TMĐT và D1 CRM.</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
