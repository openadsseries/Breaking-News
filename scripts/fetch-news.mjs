import fs from 'fs/promises';
import path from 'path';
import Parser from 'rss-parser';
import dotenv from 'dotenv';
import crypto from 'crypto';

dotenv.config({ path: '.env.local' });

const parser = new Parser({
  timeout: 5000,
  headers: { 'User-Agent': 'BreakingNews/1.0' },
});

// ─── RSS Sources ───
const RSS_FEEDS = [
  // Crypto
  { url: 'https://www.theblock.co/rss.xml', source: 'The Block' },
  { url: 'https://cointelegraph.com/rss', source: 'CoinTelegraph' },
  { url: 'https://decrypt.co/feed', source: 'Decrypt' },
  { url: 'https://www.coindesk.com/arc/outboundfeeds/rss/', source: 'CoinDesk' },
  { url: 'https://news.bitcoin.com/feed/', source: 'Bitcoin.com' },
  { url: 'https://bitcoinmagazine.com/.rss/full/', source: 'Bitcoin Magazine' },
  { url: 'https://thedefiant.io/feed', source: 'The Defiant' },
  // Politics
  { url: 'https://rss.politico.com/politics-news.xml', source: 'Politico' },
  { url: 'https://trumpstruth.org/feed', source: 'Trump Truth' },
  // AI
  { url: 'https://openai.com/blog/rss.xml', source: 'OpenAI' },
  // Tech
  { url: 'https://techcrunch.com/feed/', source: 'TechCrunch' },
];

// ─── Farcaster: Curated list (FIDs) ───
const FARCASTER_FIDS = [
  194,     // @rish
  1325,    // @cassie
  1,       // @farcaster
  8106,    // @project7
  8151,    // @if
  1439819, // @beeper
];

// ─── Reddit Subreddits ───
const SUBREDDITS = ['cryptocurrency', 'ethereum'];

// ─── GitHub Repos ───
const GITHUB_REPOS = [
  'ethereum/go-ethereum',
  'base-org/node',
  'paradigmxyz/reth',
  'anthropics/claude-code',
  'vbuterin/blog',
];

// ─── Telegram Channels (public only) ───
const TELEGRAM_CHANNELS = [
  'SolidIntelX',
  'WatcherGuru',
  'crypto_breaking_news',
  'CoinnessGL',
];

const ARTICLES_PER_FEED = 3;
const MAX_AGE_HOURS = 6;
const OUTPUT_PATH = path.join(process.cwd(), 'src', 'data', 'mock-feed.json');

// ─── Helpers ───
async function loadExisting() {
  try { return JSON.parse(await fs.readFile(OUTPUT_PATH, 'utf-8')); }
  catch { return []; }
}

function dedup(articles) {
  const seen = new Set();
  return articles.filter(a => {
    const key = a.url || a.title;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function removeOld(articles) {
  const cutoff = Date.now() - MAX_AGE_HOURS * 60 * 60 * 1000;
  return articles.filter(a => new Date(a.created_at).getTime() > cutoff);
}

function decodeEntities(str) {
  return str
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
    .replace(/&amp;/gi, '&').replace(/&lt;/gi, '<').replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"').replace(/&apos;/gi, "'")
    .replace(/&[a-z]+;/gi, ' ');
}

function toThreeLines(text) {
  if (!text) return '1. No details available.';
  const clean = decodeEntities(text.replace(/<[^>]*>/g, '')).replace(/https?:\/\/\S+/g, '').trim();
  const sentences = clean.split(/(?<=[.!?])\s+/).filter(s => s.length > 10);
  const lines = sentences.slice(0, 3);
  if (lines.length === 0) return `1. ${clean.slice(0, 200)}`;
  return lines.map((s, i) => `${i + 1}. ${s.trim()}`).join('\n');
}

// ─── Fetch RSS (parallel) ───
async function fetchRSS(existingUrls) {
  const results = await Promise.allSettled(
    RSS_FEEDS.map(async (feed) => {
      const parsed = await parser.parseURL(feed.url);
      return parsed.items.slice(0, ARTICLES_PER_FEED).filter(item => {
        if (existingUrls.has(item.link)) return false;
        // Skip empty posts (image-only retweets, etc.)
        const text = (item.title || '') + (item.contentSnippet || '');
        if (text.length < 20 || text.includes('[No Title]')) return false;
        return true;
      }).map(item => {
        console.log(`  ✅ [RSS] ${feed.source}: ${item.title?.slice(0, 50)}...`);
        return {
          id: crypto.randomUUID(), source: feed.source, type: 'rss',
          title: feed.source === 'Trump Truth' ? 'New post from Donald Trump' : item.title,
          summary: toThreeLines(item.contentSnippet || item.content || item.title),
          url: item.link,
          author: item.creator || feed.source,
          created_at: item.isoDate || new Date().toISOString(),
        };
      });
    })
  );
  return results.filter(r => r.status === 'fulfilled').flatMap(r => r.value);
}

// ─── Fetch Farcaster (single bulk API call) ───
async function fetchFarcaster(existingUrls) {
  const NEYNAR_KEY = process.env.NEYNAR_API_KEY;
  if (!NEYNAR_KEY) { console.log('  ⏭ No NEYNAR_API_KEY, skipping'); return []; }

  const articles = [];
  try {
    // Single bulk call instead of N individual calls
    const fids = FARCASTER_FIDS.join(',');
    const res = await fetch(`https://api.neynar.com/v2/farcaster/feed?feed_type=filter&filter_type=fids&fids=${fids}&limit=10`, {
      headers: { 'x-api-key': NEYNAR_KEY },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) { console.log(`  ⏭ Neynar ${res.status}, skipping`); return []; }
    const data = await res.json();
    for (const cast of (data.casts || [])) {
      const castUrl = `https://warpcast.com/${cast.author?.username || 'user'}/${cast.hash?.slice(0, 10)}`;
      if (existingUrls.has(castUrl)) continue;
      if (!cast.text || cast.text.length < 20) continue;

      const name = cast.author?.display_name || 'Farcaster';
      console.log(`  ✅ [Farcaster] ${name}: ${cast.text?.slice(0, 50)}...`);

      articles.push({
        id: crypto.randomUUID(), source: 'Farcaster', type: 'farcaster',
        title: `${name}: ${cast.text.slice(0, 80)}${cast.text.length > 80 ? '...' : ''}`,
        summary: toThreeLines(cast.text),
        url: castUrl,
        author: name,
        created_at: cast.timestamp || new Date().toISOString(),
      });
    }
  } catch (e) { console.error(`  ❌ Farcaster: ${e.message}`); }
  return articles;
}

// ─── Fetch Reddit (parallel) ───
async function fetchReddit(existingUrls) {
  const results = await Promise.allSettled(
    SUBREDDITS.map(async (sub) => {
      const res = await fetch(`https://www.reddit.com/r/${sub}/hot.json?limit=3`, {
        headers: { 'User-Agent': 'BreakingNews/1.0' },
        signal: AbortSignal.timeout(5000),
      });
      const data = await res.json();
      return (data?.data?.children || []).filter(({ data: post }) => {
        if (post.stickied) return false;
        return !existingUrls.has(`https://reddit.com${post.permalink}`);
      }).map(({ data: post }) => {
        const url = `https://reddit.com${post.permalink}`;
        console.log(`  ✅ [Reddit] r/${sub}: ${post.title?.slice(0, 50)}...`);
        return {
          id: crypto.randomUUID(), source: `r/${sub}`, type: 'reddit',
          title: post.title,
          summary: toThreeLines(post.selftext || post.title),
          url,
          author: `u/${post.author}`,
          created_at: new Date(post.created_utc * 1000).toISOString(),
        };
      });
    })
  );
  return results.filter(r => r.status === 'fulfilled').flatMap(r => r.value);
}

// ─── Fetch GitHub (parallel) ───
async function fetchGitHub(existingUrls) {
  const results = await Promise.allSettled(
    GITHUB_REPOS.map(async (repo) => {
      const res = await fetch(`https://api.github.com/repos/${repo}/releases?per_page=2`, {
        headers: { 'User-Agent': 'BreakingNews/1.0' },
        signal: AbortSignal.timeout(5000),
      });
      const releases = await res.json();
      if (!Array.isArray(releases)) return [];

      return releases.filter(r => !existingUrls.has(r.html_url)).map(release => {
        const title = `${repo}: ${release.name || release.tag_name}`;
        console.log(`  ✅ [GitHub] ${title.slice(0, 50)}...`);
        return {
          id: crypto.randomUUID(), source: 'GitHub', type: 'github',
          title, summary: toThreeLines(release.body || title),
          url: release.html_url, author: release.author?.login || repo,
          created_at: release.published_at || new Date().toISOString(),
        };
      });
    })
  );
  return results.filter(r => r.status === 'fulfilled').flatMap(r => r.value);
}

// ─── Fetch Telegram (public channels via web preview) ───
async function fetchTelegram(existingUrls) {
  const results = await Promise.allSettled(
    TELEGRAM_CHANNELS.map(async (channel) => {
      const res = await fetch(`https://t.me/s/${channel}`, {
        headers: { 'User-Agent': 'BreakingNews/1.0' },
        signal: AbortSignal.timeout(5000),
      });
      const html = await res.text();

      // Parse messages
      const msgRegex = /tgme_widget_message_text[^>]*>(.*?)<\/div>/gs;
      const timeRegex = /datetime="([^"]+)"/g;
      const texts = [...html.matchAll(msgRegex)].map(m =>
        decodeEntities(m[1].replace(/<[^>]+>/g, '')).trim()
      );
      const times = [...html.matchAll(timeRegex)].map(m => m[1]);

      const articles = [];
      for (let i = texts.length - 1; i >= Math.max(0, texts.length - ARTICLES_PER_FEED); i--) {
        if (!texts[i] || texts[i].length < 20) continue;
        const url = `https://t.me/s/${channel}#msg-${i}`;
        if (existingUrls.has(url)) continue;

        console.log(`  ✅ [Telegram] @${channel}: ${texts[i].slice(0, 50)}...`);
        let rawText = texts[i];
        let title = rawText.slice(0, 100) + (rawText.length > 100 ? '...' : '');
        let summaryText = rawText;

        // Parse format like "[BTC falls below $78,000] According to CoinNess..."
        const match = rawText.match(/^\[(.*?)\](.*)/s);
        if (match) {
          title = match[1].trim();
          summaryText = match[2].trim();
        }

        articles.push({
          id: crypto.randomUUID(), source: `@${channel}`, type: 'telegram',
          title,
          summary: toThreeLines(summaryText),
          url: `https://t.me/${channel}`,
          author: `@${channel}`,
          created_at: times[i] || new Date().toISOString(),
        });
      }
      return articles;
    })
  );
  return results.filter(r => r.status === 'fulfilled').flatMap(r => r.value);
}

async function main() {
  const existing = await loadExisting();
  const existingUrls = new Set(existing.map(a => a.url));

  console.log(`\n📰 Breaking News — Feed Update`);
  console.log(`📦 ${existing.length} existing articles\n`);

  // All sources in parallel
  const [rss, farcaster, reddit, github, telegram] = await Promise.all([
    fetchRSS(existingUrls).then(r => { console.log(`🔵 RSS: ${r.length}`); return r; }),
    fetchFarcaster(existingUrls).then(r => { console.log(`🟣 Farcaster: ${r.length}`); return r; }),
    fetchReddit(existingUrls).then(r => { console.log(`🟠 Reddit: ${r.length}`); return r; }),
    fetchGitHub(existingUrls).then(r => { console.log(`⚫ GitHub: ${r.length}`); return r; }),
    fetchTelegram(existingUrls).then(r => { console.log(`🔷 Telegram: ${r.length}`); return r; }),
  ]);

  const allNew = [...rss, ...farcaster, ...reddit, ...github, ...telegram];
  const merged = dedup([...allNew, ...existing]);
  const fresh = removeOld(merged);
  fresh.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  await fs.writeFile(OUTPUT_PATH, JSON.stringify(fresh, null, 2));
  console.log(`\n🎉 Done! ${fresh.length} total (${allNew.length} new)`);
}

// 2-minute hard limit
const timeout = setTimeout(() => { console.log('⏰ 2min timeout, exiting'); process.exit(0); }, 120000);
main().then(() => clearTimeout(timeout)).catch(console.error);
