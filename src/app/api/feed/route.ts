import { NextResponse } from "next/server";
import feed from "@/data/mock-feed.json";

// No runtime fetch needed — every feed push triggers a Vercel build,
// so the bundled JSON is always the latest version.

export async function GET() {
  return NextResponse.json(feed, {
    headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" },
  });
}
