import { NextResponse } from "next/server";

export async function GET() {
  const config = {
    accountAssociation: {
      header: "eyJmaWQiOjE1NTA1NDIsInR5cGUiOiJjdXN0b2R5Iiwia2V5IjoiMHgxMzEyYTZCZDRjQTM5Njk0MTgxODYyQTFiOTNGMTFlNUJhNWE1MzUyIn0",
      payload: "eyJkb21haW4iOiJuZXdzLm9wZW5hZHMud29ybGQifQ",
      signature: "WPI8KRvFsZUPxq6qob4o4lPpPZqZDv2G0wqM5ehSiqkBrqvc9HBDDWJPZkpAfr/yTyQZ1IaF4U5JRJ0F/oe19Rw=",
    },
    frame: {
      version: "1",
      name: "Breaking News",
      subtitle: "Read It Before Everyone Else",
      description: "Crypto moves fast. Read breaking news before anyone else. Swipe, share, earn BREAKING NEWS tokens on Base.",
      iconUrl: "https://news.openads.world/icon.png",
      homeUrl: "https://news.openads.world",
      imageUrl: "https://news.openads.world/og-image.png",
      splashImageUrl: "https://news.openads.world/splash.png",
      splashBackgroundColor: "#dcdad2",
      buttonTitle: "Read It First",
      primaryCategory: "news-media",
      tags: ["crypto", "news", "breaking", "base", "fomo"],
      tagline: "Read it before everyone else",
      ogTitle: "Breaking News — Read It First",
      ogDescription: "Most people will read this tomorrow. You can read it now.",
      ogImageUrl: "https://news.openads.world/og-image.png",
    },
  };

  return NextResponse.json(config);
}
