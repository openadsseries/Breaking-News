import { NextResponse } from "next/server";

export async function GET() {
  const config = {
    accountAssociation: {
      header: "eyJmaWQiOjE1NTA1NDIsInR5cGUiOiJjdXN0b2R5Iiwia2V5IjoiMHgxMzEyYTZCZDRjQTM5Njk0MTgxODYyQTFiOTNGMTFlNUJhNWE1MzUyIn0",
      payload: "eyJkb21haW4iOiJicmVha2luZy1uZXdzLXRoZXRhLnZlcmNlbC5hcHAifQ",
      signature: "Za+wIEGlr13VtLrMpHJiqxvaCod19NV+Cj02TFY3WrMDh66u44X+NHp5SiLAhDYAjK07U9TeR64jjdPgxC1CgRs=",
    },
    frame: {
      version: "1",
      name: "Breaking News",
      subtitle: "Read It Before Everyone Else",
      description: "Crypto moves fast. Read breaking news before anyone else. Swipe, share, earn BREAKING NEWS tokens on Base.",
      iconUrl: "https://breaking-news-theta.vercel.app/icon.png",
      homeUrl: "https://breaking-news-theta.vercel.app",
      imageUrl: "https://breaking-news-theta.vercel.app/og-image.png",
      splashImageUrl: "https://breaking-news-theta.vercel.app/splash.png",
      splashBackgroundColor: "#dcdad2",
      buttonTitle: "Read It First",
      primaryCategory: "news-media",
      tags: ["crypto", "news", "breaking", "base", "fomo"],
      tagline: "Read it before everyone else",
      ogTitle: "Breaking News — Read It First",
      ogDescription: "Most people will read this tomorrow. You can read it now.",
      ogImageUrl: "https://breaking-news-theta.vercel.app/og-image.png",
    },
  };

  return NextResponse.json(config);
}
