import { NextResponse } from "next/server";

const GITHUB_RAW =
  "https://raw.githubusercontent.com/openadsseries/Breaking-News/main/src/data/mock-feed.json";

export const dynamic = "force-dynamic";          // never cache at build-time
export const revalidate = 0;                     // ISR off — always fresh

export async function GET() {
  try {
    // Cache-bust GitHub Raw CDN with timestamp
    const bustUrl = `${GITHUB_RAW}?t=${Date.now()}`;
    const res = await fetch(bustUrl, {
      cache: "no-store",                          // skip Next.js fetch cache entirely
      headers: { "User-Agent": "BreakingNews/1.0" },
    });

    if (!res.ok) {
      // Fallback: use bundled file
      const { default: fallback } = await import("@/data/mock-feed.json");
      return NextResponse.json(fallback, {
        headers: { "Cache-Control": "no-store, max-age=0" },
      });
    }

    const feed = await res.json();
    return NextResponse.json(feed, {
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  } catch {
    const { default: fallback } = await import("@/data/mock-feed.json");
    return NextResponse.json(fallback, {
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  }
}
