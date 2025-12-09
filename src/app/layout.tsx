import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { siteConfig } from "@/config/site";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: siteConfig.name,
  description: siteConfig.tagline,
  keywords: [
    "Kerala",
    "Malayalam",
    "Digital Archive",
    "Granthappura",
    "gpura",
    "Books",
    "Periodicals",
    "Heritage",
    "Public Domain",
  ],
  authors: [{ name: "Granthappura" }],
  openGraph: {
    title: siteConfig.name,
    description: siteConfig.tagline,
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} antialiased`} style={{ fontFamily: "var(--font-inter), system-ui, sans-serif" }}>
        {children}
      </body>
    </html>
  );
}
