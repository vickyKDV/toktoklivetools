import type { Metadata } from "next";
import { AppThemeProvider } from "@/components/theme/app-theme-provider";
import "@xyflow/react/dist/style.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Liplo",
  description: "Flow of Live Interaction",
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/brand/liplo_logo.png"
  },
  openGraph: {
    title: "Liplo",
    description: "Flow of Live Interaction",
    images: ["/brand/liplo_logo.png"]
  }
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
