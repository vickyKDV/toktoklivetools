import type { Metadata } from "next";
import { AppThemeProvider } from "@/components/theme/app-theme-provider";
import "@xyflow/react/dist/style.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "TikTok Live Automation",
  description: "Realtime TikTok LIVE automation platform for overlays, alerts, and rules."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-app-theme="dark" suppressHydrationWarning>
      <body>
        <AppThemeProvider>{children}</AppThemeProvider>
      </body>
    </html>
  );
}
