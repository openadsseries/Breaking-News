import { NextRequest, NextResponse } from "next/server";
import { privateKeyToAccount } from "viem/accounts";
import { keccak256, encodePacked, Hex } from "viem";

const PRIVATE_KEY = process.env.PRIVATE_KEY as Hex;
const NEYNAR_KEY = process.env.NEYNAR_API_KEY || "";
const MIN_SCORE = 0.3;

// Cache account at module level — avoid re-deriving on every request
const signerAccount = PRIVATE_KEY ? privateKeyToAccount(PRIVATE_KEY) : null;

export async function GET(req: NextRequest) {
  const address = req.nextUrl.searchParams.get("address");
  const fid = req.nextUrl.searchParams.get("fid");

  if (!address || !signerAccount) {
    return NextResponse.json({ error: "Missing address" }, { status: 400 });
  }

  // ── Gate 1: Farcaster FID required ──
  if (!fid) {
    return NextResponse.json({ error: "Farcaster account required" }, { status: 403 });
  }

  // ── Gate 2: Neynar score check (anti-spam) ──
  if (NEYNAR_KEY) {
    try {
      const res = await fetch(
        `https://api.neynar.com/v2/farcaster/user/bulk?fids=${fid}`,
        { headers: { "x-api-key": NEYNAR_KEY } }
      );
      const data = await res.json();
      const user = data?.users?.[0];

      if (!user) {
        return NextResponse.json({ error: "Farcaster user not found" }, { status: 403 });
      }

      const score = user.experimental?.neynar_user_score ?? 0;
      if (score < MIN_SCORE) {
        return NextResponse.json(
          { error: `Score too low (${score}). Build your Farcaster reputation first.` },
          { status: 403 }
        );
      }
    } catch (e: any) {
      console.error("Neynar check failed:", e.message);
    }
  }

  // ── Sign claim (using cached account) ──
  try {
    const day = BigInt(Math.floor(Date.now() / 1000 / 86400));
    const hash = keccak256(
      encodePacked(["address", "uint256"], [address as Hex, day])
    );
    const signature = await signerAccount.signMessage({ message: { raw: hash } });
    return NextResponse.json({ signature, day: day.toString() });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
