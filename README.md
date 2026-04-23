# 📰 Breaking News

**Read → Consume → Earn → Loop**

A hyper-minimalist Read-to-Earn platform with a classic newspaper aesthetic. Swipe through curated crypto signals and earn $SIGNAL tokens on Base.

## 🗞️ Features

- **Newspaper UI** — Aged paper texture, serif typography, horizontal swipe (Framer Motion)
- **8 Signal Sources** — The Block, CoinTelegraph, Decrypt, CoinDesk, TechCrunch, Farcaster, Reddit, GitHub
- **Read to Earn** — Read articles (+5 pts), Share (+15 pts), Claim 69 $SIGNAL tokens on Base
- **Zero Cost Architecture** — No database, no AI API, GitHub Actions cron for data updates
- **Web3 Native** — RainbowKit wallet connection, ERC-20 token claiming on Base mainnet

## ⚙️ Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | Next.js 16, Framer Motion, Tailwind CSS |
| Web3 | Wagmi, Viem, RainbowKit |
| Smart Contract | Solidity (ERC-20), Hardhat, Base mainnet |
| Data Pipeline | RSS Parser, Neynar (Farcaster), Reddit/GitHub APIs |
| Automation | GitHub Actions (hourly cron) |
| Hosting | Vercel (ISR) |

## 🚀 Getting Started

```bash
npm install
npm run dev
```

## 📡 Fetch Live News

```bash
node scripts/fetch-news.mjs
```

## 🔑 Environment Variables

```env
PRIVATE_KEY=0x...           # Contract deployment
NEYNAR_API_KEY=...          # Farcaster data (free)
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=...  # Wallet connection
```

## 📜 Smart Contract

- **Token**: $SIGNAL (ERC-20)
- **Network**: Base mainnet
- **Max Supply**: 100,000,000
- **Claim Amount**: 69 tokens per claim
- **Contract**: [`0x1d705c7cb1bbe119f83f48520234f074e9157907`](https://basescan.org/address/0x1d705c7cb1bbe119f83f48520234f074e9157907)

## 📄 License

MIT
