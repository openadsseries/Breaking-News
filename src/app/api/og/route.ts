import { NextResponse } from "next/server";
import { readFileSync } from "fs";
import { join } from "path";

const IMAGES = [
  "og-image-buffett.png",
  "og-image-chart-1.png",
  "og-image-chart-2.png",
];

export async function GET() {
  const pick = IMAGES[Math.floor(Math.random() * IMAGES.length)];
  const buffer = readFileSync(join(process.cwd(), "public", pick));
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "no-cache, no-store, must-revalidate",
    },
  });
}
