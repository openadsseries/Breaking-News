# 📰 Breaking News

**read it before warren buffett does.**

A hyper-minimalist Read-to-Earn Farcaster Mini App with a classic newspaper aesthetic. Swipe through curated breaking news and earn $BREAKING NEWS tokens on Base.

## 🗞️ Features

- **Newspaper UI** — Aged paper texture, serif typography, card swipe (Framer Motion)
- **Multi-Source Aggregation** — 11 RSS feeds, Farcaster, Reddit, GitHub releases, Telegram channels
- **Read to Earn** — Read 5 articles → Share → Claim 69 $BREAKING NEWS tokens on Base
- **Zero Cost Architecture** — No database, no AI API, GitHub as data store
- **Farcaster Native** — Mini App SDK, wallet connection via Farcaster connector

## ⚙️ Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | Next.js 16, Framer Motion, Tailwind CSS |
| Web3 | Wagmi, Viem, Farcaster Mini App SDK |
| Smart Contract | Solidity (BNDistributor), Base mainnet |
| Data Pipeline | RSS Parser, Neynar (Farcaster), Reddit, GitHub, Telegram |
| Automation | GitHub Actions (3h cron) + Local launchd (1h) |
| Hosting | Vercel (runtime feed fetch, no rebuild for data updates) |

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
PRIVATE_KEY=0x...           # Server-side claim signature
NEYNAR_API_KEY=...          # Farcaster data (free tier)
```

## 📜 Smart Contract

- **Token**: $BREAKING NEWS (ERC-20)
- **Network**: Base mainnet
- **Claim Amount**: 69 tokens per claim (24h cooldown)
- **Distributor**: [`0x9e6ea0c8871287d2d4c83d1e5c0602bbe0b97a82`](https://basescan.org/address/0x9e6ea0c8871287d2d4c83d1e5c0602bbe0b97a82)
- **Token Address**: [`0xa2d8735E7a71F068dA17Aba7e5A03D6300d57BaD`](https://basescan.org/address/0xa2d8735E7a71F068dA17Aba7e5A03D6300d57BaD)

## 📡 Data Sources

| Category | Sources |
|----------|---------|
| Crypto | The Block, CoinTelegraph, Decrypt, CoinDesk, Bitcoin.com, Bitcoin Magazine, The Defiant |
| Politics | Politico, Trump Truth |
| AI/Tech | OpenAI, TechCrunch |
| Social | Farcaster (curated FIDs), Reddit (r/cryptocurrency, r/ethereum) |
| Dev | GitHub releases (go-ethereum, base, reth, claude-code) |
| Messaging | Telegram (SolidIntelX, WatcherGuru, crypto_breaking_news, CoinnessGL, CoinMarketCap) |

## 📄 License

MIT
