import { NextRequest, NextResponse } from "next/server";
import { privateKeyToAccount } from "viem/accounts";
import { keccak256, encodePacked, Hex, parseEther } from "viem";

const PRIVATE_KEY = process.env.PRIVATE_KEY as Hex;
const NEYNAR_KEY = process.env.NEYNAR_API_KEY || "";

// Tiered rewards based on Neynar score
const HIGH_SCORE_THRESHOLD = 0.7;
const HIGH_REWARD = parseEther("69");   // 69 tokens for trusted users
const LOW_REWARD  = parseEther("6.9");  // 6.9 tokens for low-score users
const MIN_SCORE   = 0.3;               // Below this = blocked entirely

// Lazy cache
let _signer: ReturnType<typeof privateKeyToAccount> | null = null;
function getSigner() {
  if (!_signer && PRIVATE_KEY) _signer = privateKeyToAccount(PRIVATE_KEY);
  return _signer;
}

export async function GET(req: NextRequest) {
  const address = req.nextUrl.searchParams.get("address");
  const fid = req.nextUrl.searchParams.get("fid");

  if (!address || !getSigner()) {
    return NextResponse.json({ error: "Missing address" }, { status: 400 });
  }

  // ── Gate 1: Farcaster FID required ──
  if (!fid) {
    return NextResponse.json({ error: "Farcaster account required" }, { status: 403 });
  }

  // ── Gate 2: Neynar score check → tiered reward ──
  let claimAmount = LOW_REWARD; // default to low tier
  let score = 0;

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

      score = user.experimental?.neynar_user_score ?? 0;

      // Block very low scores entirely
      if (score < MIN_SCORE) {
        return NextResponse.json(
          { error: `Score too low (${score}). Build your Farcaster reputation first.` },
          { status: 403 }
        );
      }

      // Tier assignment
      claimAmount = score >= HIGH_SCORE_THRESHOLD ? HIGH_REWARD : LOW_REWARD;
    } catch (e: any) {
      console.error("Neynar check failed:", e.message);
      // On Neynar failure, default to low reward (safe fallback)
      claimAmount = LOW_REWARD;
    }
  }

  // ── Sign claim with amount (V2: user + day + amount) ──
  try {
    const day = BigInt(Math.floor(Date.now() / 1000 / 86400));
    const hash = keccak256(
      encodePacked(
        ["address", "uint256", "uint256"],
        [address as Hex, day, claimAmount]
      )
    );
    const signature = await getSigner()!.signMessage({ message: { raw: hash } });
    return NextResponse.json({
      signature,
      day: day.toString(),
      amount: claimAmount.toString(),
      tier: score >= HIGH_SCORE_THRESHOLD ? "high" : "low",
      score,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
