import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Poetry of China · 诗语中国",
  description:
    "Learn and understand classic Chinese poetry through joyful fill-in games — one character, one rice grid at a time.",
  // TODO: 部署后补 metadataBase 与 og:image 分享卡片图
  openGraph: {
    title: "Poetry of China · 诗语中国",
    description:
      "Learn and understand classic Chinese poetry through joyful fill-in games — one character, one rice grid at a time.",
    type: "website",
    siteName: "Poetry of China · 诗语中国",
  },
  twitter: {
    card: "summary",
    title: "Poetry of China · 诗语中国",
    description:
      "Learn and understand classic Chinese poetry through joyful fill-in games — one character, one rice grid at a time.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
