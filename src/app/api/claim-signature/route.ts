import { NextRequest, NextResponse } from "next/server";
import { privateKeyToAccount } from "viem/accounts";
import { keccak256, encodePacked, Hex } from "viem";

const PRIVATE_KEY = process.env.PRIVATE_KEY as Hex;
const NEYNAR_KEY = process.env.NEYNAR_API_KEY || "";
const MIN_SCORE = 0.3; // Neynar experimental score threshold

export async function GET(req: NextRequest) {
  const address = req.nextUrl.searchParams.get("address");
  const fid = req.nextUrl.searchParams.get("fid");

  if (!address || !PRIVATE_KEY) {
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

      // Check experimental quality score
      const score = user.experimental?.neynar_user_score ?? 0;
      if (score < MIN_SCORE) {
        return NextResponse.json(
          { error: `Score too low (${score}). Build your Farcaster reputation first.` },
          { status: 403 }
        );
      }

      // Verify the user's verified address matches the claim address
      const verifiedAddresses: string[] = (user.verified_addresses?.eth_addresses || [])
        .map((a: string) => a.toLowerCase());
      const custodyAddress = (user.custody_address || "").toLowerCase();

      if (
        !verifiedAddresses.includes(address.toLowerCase()) &&
        custodyAddress !== address.toLowerCase()
      ) {
        return NextResponse.json(
          { error: "Wallet not linked to this Farcaster account" },
          { status: 403 }
        );
      }
    } catch (e: any) {
      // If Neynar is down, fail open but log
      console.error("Neynar check failed:", e.message);
    }
  }

  // ── Sign claim ──
  try {
    const account = privateKeyToAccount(PRIVATE_KEY);
    const day = BigInt(Math.floor(Date.now() / 1000 / 86400));
    const hash = keccak256(
      encodePacked(["address", "uint256"], [address as Hex, day])
    );
    const signature = await account.signMessage({ message: { raw: hash } });
    return NextResponse.json({ signature, day: day.toString() });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
