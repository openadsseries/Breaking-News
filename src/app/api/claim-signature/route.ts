import { NextRequest, NextResponse } from "next/server";
import { privateKeyToAccount } from "viem/accounts";
import { keccak256, encodePacked, Hex } from "viem";

// Same key that deployed the contract (= signer)
const PRIVATE_KEY = process.env.PRIVATE_KEY as Hex;

export async function GET(req: NextRequest) {
  const address = req.nextUrl.searchParams.get("address");
  if (!address || !PRIVATE_KEY) {
    return NextResponse.json({ error: "Missing params" }, { status: 400 });
  }

  try {
    const account = privateKeyToAccount(PRIVATE_KEY);

    // Sign: keccak256(userAddress, day)
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
