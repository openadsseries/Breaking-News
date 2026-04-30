import { createWalletClient, createPublicClient, http, parseAbi, formatEther } from "viem";
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

const TOKEN      = "0xa2d8735E7a71F068dA17Aba7e5A03D6300d57BaD";
const OLD_DIST   = "0x9e6ea0c8871287d2d4c83d1e5c0602bbe0b97a82";
const NEW_DIST   = "0x12acfe1a0cf664eefe3a97b4165b5dfc10ad5b21";

const distAbi = parseAbi([
  "function remaining() view returns (uint256)",
  "function withdraw(uint256 amount) external",
]);
const erc20Abi = parseAbi([
  "function transfer(address to, uint256 amount) external returns (bool)",
  "function balanceOf(address account) view returns (uint256)",
]);

const publicClient = createPublicClient({ chain: base, transport: http() });
const walletClient = createWalletClient({ account, chain: base, transport: http() });

async function main() {
  // 1. Check old contract balance
  const oldBalance = await publicClient.readContract({
    address: OLD_DIST, abi: distAbi, functionName: "remaining",
  });
  console.log(`📦 Old distributor balance: ${formatEther(oldBalance)} BN`);

  if (oldBalance === 0n) {
    console.log("⚠️  Old distributor is empty, nothing to migrate.");
  } else {
    // 2. Withdraw from old → owner wallet
    console.log(`📤 Withdrawing ${formatEther(oldBalance)} BN from old distributor...`);
    const withdrawHash = await walletClient.writeContract({
      address: OLD_DIST, abi: distAbi, functionName: "withdraw", args: [oldBalance],
    });
    console.log(`   Tx: ${withdrawHash}`);
    await publicClient.waitForTransactionReceipt({ hash: withdrawHash });
    console.log(`   ✅ Withdrawn to owner wallet`);
  }

  // 3. Check owner wallet token balance
  const ownerBalance = await publicClient.readContract({
    address: TOKEN, abi: erc20Abi, functionName: "balanceOf", args: [account.address],
  });
  console.log(`\n💰 Owner wallet balance: ${formatEther(ownerBalance)} BN`);

  if (ownerBalance === 0n) {
    console.log("⚠️  No tokens to send to new distributor.");
    return;
  }

  // 4. Transfer all tokens to new distributor
  console.log(`📤 Sending ${formatEther(ownerBalance)} BN to new V2 distributor...`);
  const transferHash = await walletClient.writeContract({
    address: TOKEN, abi: erc20Abi, functionName: "transfer", args: [NEW_DIST, ownerBalance],
  });
  console.log(`   Tx: ${transferHash}`);
  await publicClient.waitForTransactionReceipt({ hash: transferHash });

  // 5. Verify
  const newBalance = await publicClient.readContract({
    address: NEW_DIST, abi: distAbi, functionName: "remaining",
  });
  console.log(`\n✅ Migration complete!`);
  console.log(`   New V2 distributor balance: ${formatEther(newBalance)} BN`);
  console.log(`   Address: ${NEW_DIST}`);
}

main().catch((e) => { console.error("❌", e.message); process.exit(1); });
