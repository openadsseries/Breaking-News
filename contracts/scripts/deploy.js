import { createWalletClient, createPublicClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base } from "viem/chains";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// 1) Read private key from .env.local
const envPath = resolve(__dirname, "../../.env.local");
const envContent = readFileSync(envPath, "utf-8");
const match = envContent.match(/PRIVATE_KEY=(.+)/);
if (!match) { console.error("❌ PRIVATE_KEY not found in .env.local"); process.exit(1); }
const account = privateKeyToAccount(match[1].trim());

console.log(`🔑 Deploying from: ${account.address}`);

// 2) Read compiled contract artifact
const artifact = JSON.parse(
  readFileSync(resolve(__dirname, "../artifacts/contracts/SignalToken.sol/SignalToken.json"), "utf-8")
);

// 3) Create clients
const publicClient = createPublicClient({ chain: base, transport: http() });
const walletClient = createWalletClient({ account, chain: base, transport: http() });

// 4) Deploy
async function main() {
  console.log("📡 Deploying SignalToken to Base mainnet...");

  const hash = await walletClient.deployContract({
    abi: artifact.abi,
    bytecode: artifact.bytecode,
    args: [],
  });

  console.log(`⏳ Transaction sent: ${hash}`);
  console.log("   Waiting for confirmation...");

  const receipt = await publicClient.waitForTransactionReceipt({ hash });

  console.log(`\n✅ SignalToken deployed to: ${receipt.contractAddress}`);
  console.log(`   Block: ${receipt.blockNumber}`);
  console.log(`   Explorer: https://basescan.org/address/${receipt.contractAddress}`);
}

main().catch((e) => { console.error("❌ Deploy failed:", e.message); process.exit(1); });
