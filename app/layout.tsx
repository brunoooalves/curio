import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Fraunces } from "next/font/google";
import "./globals.css";
import { BottomNav } from "@/components/bottom-nav";
import { DesktopSidebar } from "@/components/desktop-sidebar";
import { ModeController } from "@/components/mode-controller";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const fraunces = Fraunces({
  variable: "--font-serif",
  subsets: ["latin"],
  axes: ["SOFT", "opsz"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Curio",
  description: "App de aprendizado por grade curricular — gastronomia.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f5f1e8",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      data-mode="learning"
      className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="min-h-full flex">
        <ModeController />
        <DesktopSidebar />
        <div className="flex-1 flex flex-col min-w-0 pb-20 md:pb-0">
          {children}
        </div>
        <BottomNav />
      </body>
    </html>
  );
}
