import type { Metadata, Viewport } from "next";
import { Cairo, Inter } from "next/font/google";
import dynamic from "next/dynamic";
import "./globals.css";
import { I18nProvider } from "@/lib/i18n";

const InstallPrompt = dynamic(() => import("@/components/InstallPrompt"), {
  ssr: false,
});

const cairo = Cairo({
  subsets: ["arabic", "latin"],
  weight: ["400", "600", "700"],
});

const inter = Inter({
  subsets: ["latin"],
});

export const viewport: Viewport = {
  themeColor: "#0b0f17",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "PR AI WORKFORCE — Operating System",
  description: "Internal AI Workforce Management Platform (Om Samah + 38 Specialized Agents)",
  manifest: "/manifest.webmanifest",
  applicationName: "PR Workforce",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "PR Workforce",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" className={`dark ${cairo.className}`}>
      <body className="bg-[#0d0e12] text-white antialiased min-h-screen">
        <I18nProvider>
          {children}
          <InstallPrompt />
        </I18nProvider>
      </body>
    </html>
  );
}
