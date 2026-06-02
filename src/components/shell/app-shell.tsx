"use client";

import { Menu } from "lucide-react";
import { useState, type ReactNode } from "react";
import { MobileNav } from "./mobile-nav";
import { Sidebar } from "./sidebar";

type AppShellProps = {
  children: ReactNode;
  environmentLabel?: string;
};

export function AppShell({ children, environmentLabel = "Môi trường real" }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const needsAttention = environmentLabel.toLowerCase().includes("chưa");

  return (
    <div className="min-h-screen bg-[#f5f7fb] text-slate-900">
      {sidebarOpen ? (
        <button
          className="fixed inset-0 z-30 bg-slate-950/60 backdrop-blur-sm md:hidden"
          aria-label="Đóng menu"
          onClick={() => setSidebarOpen(false)}
        />
      ) : null}
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="md:pl-72">
        <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/90 shadow-sm shadow-slate-200/40 backdrop-blur-xl">
          <div className="flex min-h-16 items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
            <button
              type="button"
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 shadow-sm focus-ring md:hidden"
              aria-label="Mở menu"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" aria-hidden="true" />
            </button>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-bold text-slate-950">
                Shop Huy Vân CRM
              </div>
              <div className="truncate text-xs text-slate-500 sm:text-sm">
                Điều phối Fanpage, nội dung, Ads và sản phẩm thật
              </div>
            </div>
            <div className="hidden items-center gap-2 md:flex">
              <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 ring-1 ring-emerald-200">
                Production
              </span>
              <span
                className={[
                  "rounded-full px-3 py-1.5 text-xs font-bold ring-1",
                  needsAttention
                    ? "bg-amber-50 text-amber-700 ring-amber-200"
                    : "bg-sky-50 text-sky-700 ring-sky-200"
                ].join(" ")}
              >
                {environmentLabel}
              </span>
            </div>
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1440px] px-4 py-5 pb-24 sm:px-6 md:pb-8 lg:px-8 lg:py-8">
          {children}
        </main>
      </div>
      <MobileNav />
    </div>
  );
}
