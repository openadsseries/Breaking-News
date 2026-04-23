import { NextResponse } from "next/server";

export async function GET() {
  const config = {
    accountAssociation: {
      header: "eyJmaWQiOjE1NTA1NDIsInR5cGUiOiJjdXN0b2R5Iiwia2V5IjoiMHgxMzEyYTZCZDRjQTM5Njk0MTgxODYyQTFiOTNGMTFlNUJhNWE1MzUyIn0",
      payload: "eyJkb21haW4iOiJicmVha2luZy1uZXdzLW9tZWdhLnZlcmNlbC5hcHAifQ",
      signature: "PC9CJ3uTxB7OM1viOF2Gtq/RWqqv0DAWbbrAJyJnFo8Dxktpm9z8loAbL5JasUsudXtIg84Jc6f6vQIWulSvOxs=",
    },
    frame: {
      version: "1",
      name: "Breaking News",
      iconUrl: "https://breaking-news-omega.vercel.app/icon.png",
      homeUrl: "https://breaking-news-omega.vercel.app",
      imageUrl: "https://breaking-news-omega.vercel.app/og-image.png",
      splashImageUrl: "https://breaking-news-omega.vercel.app/splash.png",
      splashBackgroundColor: "#dcdad2",
      buttonTitle: "📰 Read & Earn",
    },
  };

  return NextResponse.json(config);
}
