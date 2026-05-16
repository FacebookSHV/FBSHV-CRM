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

  return (
    <div className="min-h-screen bg-slate-100">
      {sidebarOpen ? (
        <button
          className="fixed inset-0 z-30 bg-slate-950/40 lg:hidden"
          aria-label="Đóng menu"
          onClick={() => setSidebarOpen(false)}
        />
      ) : null}
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="lg:pl-72">
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
          <div className="flex min-h-16 items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
            <button
              type="button"
              className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-slate-200 text-slate-700 focus-ring lg:hidden"
              aria-label="Mở menu"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" aria-hidden="true" />
            </button>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold text-ink">
                Shop Huy Vân
              </div>
              <div className="truncate text-xs text-slate-500">
                CRM Facebook kết nối Web Quản Lý TMĐT
              </div>
            </div>
            <div className="rounded-md border border-slate-200 px-3 py-2 text-right">
              <div className="text-xs font-semibold text-ink">Production</div>
              <div className="text-[11px] text-slate-500">{environmentLabel}</div>
            </div>
          </div>
        </header>
        <main className="mx-auto w-full max-w-7xl px-4 py-5 pb-24 sm:px-6 lg:px-8 lg:pb-8">
          {children}
        </main>
      </div>
      <MobileNav />
    </div>
  );
}
