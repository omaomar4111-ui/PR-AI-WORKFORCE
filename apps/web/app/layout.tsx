import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PR AI WORKFORCE — Operating System",
  description: "Internal AI Workforce Management Platform (Om Samah + 38 Specialized Agents)",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-[#0d0e12] text-white antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}
