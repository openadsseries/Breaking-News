import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, "../.env.local");

let PRIVATE_KEY = "";
try {
  const envContent = readFileSync(envPath, "utf-8");
  const match = envContent.match(/PRIVATE_KEY=(.+)/);
  if (match) PRIVATE_KEY = match[1].trim();
} catch (e) {
  console.warn("⚠️  .env.local not found");
}

/** @type import('hardhat/config').HardhatUserConfig */
export default {
  solidity: "0.8.20",
  networks: {
    base: {
      type: "http",
      url: "https://mainnet.base.org",
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
    },
  },
};
