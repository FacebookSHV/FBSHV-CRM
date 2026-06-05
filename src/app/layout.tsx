import type { Metadata, Viewport } from "next";
import { AppShell } from "@/components/shell/app-shell";
import "./globals.css";

export const metadata: Metadata = {
  title: "FBSHV CRM",
  description: "CRM Facebook kết nối Web Quản Lý TMĐT qua API an toàn"
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1
};

export default function RootLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  const usesFallback = process.env.MOCK_EXTERNAL_APIS !== "false" || process.env.MOCK_ECOMMERCE_API !== "false";

  return (
    <html lang="vi">
      <body>
        <AppShell environmentLabel={usesFallback ? "Môi trường chưa kết nối đủ" : "Môi trường real"}>{children}</AppShell>
      </body>
    </html>
  );
}
