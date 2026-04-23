import { NextResponse } from "next/server";

export async function GET() {
  const config = {
    accountAssociation: {
      // TODO: Generate this by signing with your Farcaster custody address
      // Use the Farcaster Mini App Manifest Tool to create this
      header: "",
      payload: "",
      signature: "",
    },
    frame: {
      version: "1",
      name: "Breaking News",
      iconUrl: "https://breaking-news-mcdonaldbikmac-source.vercel.app/icon.png",
      homeUrl: "https://breaking-news-mcdonaldbikmac-source.vercel.app",
      imageUrl: "https://breaking-news-mcdonaldbikmac-source.vercel.app/og-image.png",
      splashImageUrl: "https://breaking-news-mcdonaldbikmac-source.vercel.app/splash.png",
      splashBackgroundColor: "#dcdad2",
      buttonTitle: "📰 Read & Earn",
    },
  };

  return NextResponse.json(config);
}
