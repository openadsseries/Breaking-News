import { NextResponse } from "next/server";

const GITHUB_RAW =
  "https://raw.githubusercontent.com/openadsseries/Breaking-News/main/src/data/mock-feed.json";

export const dynamic = "force-dynamic";          // never cache at build-time
export const revalidate = 0;                     // ISR off — always fresh

export async function GET() {
  try {
    const res = await fetch(GITHUB_RAW, {
      next: { revalidate: 300 },                 // edge cache 5 min
      headers: { "User-Agent": "BreakingNews/1.0" },
    });

    if (!res.ok) {
      // Fallback: use bundled file
      const { default: fallback } = await import("@/data/mock-feed.json");
      return NextResponse.json(fallback, {
        headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" },
      });
    }

    const feed = await res.json();
    return NextResponse.json(feed, {
      headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" },
    });
  } catch {
    const { default: fallback } = await import("@/data/mock-feed.json");
    return NextResponse.json(fallback);
  }
}
