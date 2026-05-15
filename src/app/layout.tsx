import type { Metadata } from "next";
import { AppShell } from "@/components/shell/app-shell";
import "./globals.css";

export const metadata: Metadata = {
  title: "FBSHV CRM",
  description: "CRM Facebook kết nối Web Quản Lý TMĐT qua API an toàn"
};

export default function RootLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  const usesMock = process.env.MOCK_EXTERNAL_APIS !== "false" || process.env.MOCK_ECOMMERCE_API !== "false";

  return (
    <html lang="vi">
      <body>
        <AppShell environmentLabel={usesMock ? "Môi trường mock" : "Môi trường real"}>{children}</AppShell>
      </body>
    </html>
  );
}
