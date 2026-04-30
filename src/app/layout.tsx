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
  title: "Breaking News — Read It Before Everyone Else",
  description: "Crypto moves fast. Read breaking news before anyone else. Swipe, share, earn $BREAKING NEWS tokens.",
  openGraph: {
    title: "Breaking News — Read It First",
    description: "Most people will read this tomorrow. You can read it now.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Breaking News — Read It First",
    description: "Most people will read this tomorrow. You can read it now.",
  },
  other: {
    // Frame v2 embed — renders as mini app launch button in casts
    "fc:frame": JSON.stringify({
      version: "next",
      imageUrl: "https://news.openads.world/og-image.png",
      button: {
        title: "Read It First",
        action: {
          type: "launch_frame",
          name: "Breaking News",
          url: "https://news.openads.world",
          splashImageUrl: "https://news.openads.world/splash.png",
          splashBackgroundColor: "#dcdad2",
        },
      },
    }),
  },
};

import Script from "next/script";

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
      <head>
        <link rel="stylesheet" href="https://api.openads.world/api/v1/serve/dynamic-css?publisher=0x895af8672d72528f168a239a16c4c07eee4890c0" />
      </head>
      <body className="min-h-full flex flex-col">
        <Providers>{children}</Providers>

        {/* OpenAds Network */}
        <Script src="https://api.openads.world/snippet.js" strategy="afterInteractive" />
        <iframe className="openads-popup" src="https://api.openads.world/serve?publisher=0x895af8672d72528f168a239a16c4c07eee4890c0&placement=300x250-0x895af8672d72528f168a239a16c4c07eee4890c0&position=popup&parent_url=https%3A%2F%2Fnews.openads.world%2F&app_id=a14f5673-2662-4871-9fb6-e3bc874ffd10" title="Advertisement" width="300" height="250" style={{display:'none', border:'none'}} scrolling="no" sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox" allow="clipboard-write"></iframe>
        <iframe className="openads-floating" src="https://api.openads.world/serve?publisher=0x895af8672d72528f168a239a16c4c07eee4890c0&placement=64x64-0x895af8672d72528f168a239a16c4c07eee4890c0&position=floating&parent_url=https%3A%2F%2Fnews.openads.world%2F&app_id=a14f5673-2662-4871-9fb6-e3bc874ffd10" title="Advertisement" width="64" height="64" style={{display:'none', position:'fixed', top:'20px', right:'20px', width:'64px', height:'64px', border:'none', borderRadius:'50%', zIndex:999999}} scrolling="no" sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox" allow="clipboard-write"></iframe>
        <iframe className="openads-top-banner" src="https://api.openads.world/serve?publisher=0x895af8672d72528f168a239a16c4c07eee4890c0&placement=320x50_top-0x895af8672d72528f168a239a16c4c07eee4890c0&position=top&parent_url=https%3A%2F%2Fnews.openads.world%2F&app_id=a14f5673-2662-4871-9fb6-e3bc874ffd10" title="Advertisement" width="320" height="50" style={{display:'none', border:'none'}} scrolling="no" sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox" allow="clipboard-write"></iframe>
        <iframe className="openads-banner" src="https://api.openads.world/serve?publisher=0x895af8672d72528f168a239a16c4c07eee4890c0&placement=320x50-0x895af8672d72528f168a239a16c4c07eee4890c0&position=bottom&parent_url=https%3A%2F%2Fnews.openads.world%2F&app_id=a14f5673-2662-4871-9fb6-e3bc874ffd10" title="Advertisement" width="320" height="50" style={{display:'none', border:'none'}} scrolling="no" sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox" allow="clipboard-write"></iframe>
      </body>
    </html>
  );
}
