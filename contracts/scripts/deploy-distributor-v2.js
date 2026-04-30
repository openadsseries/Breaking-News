import { createWalletClient, createPublicClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base } from "viem/chains";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const envPath = resolve(__dirname, "../../.env.local");
const envContent = readFileSync(envPath, "utf-8");
const match = envContent.match(/PRIVATE_KEY=(.+)/);
if (!match) { console.error("❌ PRIVATE_KEY not found"); process.exit(1); }
const account = privateKeyToAccount(match[1].trim());

const TOKEN_ADDRESS = "0xa2d8735E7a71F068dA17Aba7e5A03D6300d57BaD";

console.log(`🔑 Deploying from: ${account.address}`);
console.log(`🪙 Token: ${TOKEN_ADDRESS}`);

const artifact = JSON.parse(
  readFileSync(resolve(__dirname, "../artifacts/contracts/BNDistributorV2.sol/BNDistributorV2.json"), "utf-8")
);

const publicClient = createPublicClient({ chain: base, transport: http() });
const walletClient = createWalletClient({ account, chain: base, transport: http() });

async function main() {
  console.log("📡 Deploying BNDistributorV2 to Base mainnet...");

  const hash = await walletClient.deployContract({
    abi: artifact.abi,
    bytecode: artifact.bytecode,
    args: [TOKEN_ADDRESS, account.address], // token, signer (= deployer)
  });

  console.log(`⏳ Tx: ${hash}`);
  const receipt = await publicClient.waitForTransactionReceipt({ hash });

  console.log(`\n✅ BNDistributorV2 deployed to: ${receipt.contractAddress}`);
  console.log(`   Explorer: https://basescan.org/address/${receipt.contractAddress}`);
  console.log(`\n📋 Next steps:`);
  console.log(`   1. Update CONTRACT_ADDRESS in src/app/page.tsx`);
  console.log(`   2. Send BREAKING NEWS tokens to this new address`);
  console.log(`   3. Withdraw remaining tokens from old distributor`);
}

main().catch((e) => { console.error("❌", e.message); process.exit(1); });
