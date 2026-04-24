import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Providers } from "@/components/providers";
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
  title: "Breaking News — Read to Earn",
  description: "Consume crypto signals from RSS, Farcaster, Reddit & GitHub. Read news, earn $SIGNAL tokens. Zero cost, zero database.",
  openGraph: {
    title: "Breaking News — Read to Earn",
    description: "Swipe through curated crypto signals. Earn $SIGNAL tokens for reading and sharing.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Breaking News — Read to Earn",
    description: "Swipe through curated crypto signals. Earn $SIGNAL tokens.",
  },
  other: {
    // Frame v2 embed — renders as mini app launch button in casts
    "fc:frame": JSON.stringify({
      version: "next",
      imageUrl: "https://breaking-news-omega.vercel.app/og-image.png",
      button: {
        title: "Read and Earn",
        action: {
          type: "launch_frame",
          name: "Breaking News",
          url: "https://breaking-news-omega.vercel.app",
          splashImageUrl: "https://breaking-news-omega.vercel.app/splash.png",
          splashBackgroundColor: "#dcdad2",
        },
      },
    }),
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
      <body className="min-h-full flex flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
