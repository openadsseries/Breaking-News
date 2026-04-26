import fs from 'fs/promises';
import path from 'path';
import Parser from 'rss-parser';
import dotenv from 'dotenv';
import crypto from 'crypto';

dotenv.config({ path: '.env.local' });

const parser = new Parser({
  timeout: 10000, // 10s timeout
  headers: { 'User-Agent': 'BreakingNews/1.0' },
});

// ─── RSS Sources ───
const RSS_FEEDS = [
  { url: 'https://www.theblock.co/rss.xml', source: 'The Block' },
  { url: 'https://cointelegraph.com/rss', source: 'CoinTelegraph' },
  { url: 'https://decrypt.co/feed', source: 'Decrypt' },
  { url: 'https://www.coindesk.com/arc/outboundfeeds/rss/', source: 'CoinDesk' },
  { url: 'https://techcrunch.com/feed/', source: 'TechCrunch' },
  { url: 'https://trumpstruth.org/feed', source: 'Trump Truth' },
];

// ─── Farcaster: Curated builder list (FIDs) ───
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

const ARTICLES_PER_FEED = 3;
const MAX_AGE_HOURS = 24;
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

// Split text into 3 clean lines for our UI
function toThreeLines(text) {
  if (!text) return '1. No details available.';
  // Clean HTML tags
  const clean = text.replace(/<[^>]*>/g, '').replace(/&[a-z]+;/gi, ' ').trim();
  // Split into sentences
  const sentences = clean.split(/(?<=[.!?])\s+/).filter(s => s.length > 10);
  const lines = sentences.slice(0, 3);
  if (lines.length === 0) return `1. ${clean.slice(0, 200)}`;
  return lines.map((s, i) => `${i + 1}. ${s.trim()}`).join('\n');
}

// ─── Fetch RSS ───
async function fetchRSS(existingUrls) {
  const articles = [];
  for (const feed of RSS_FEEDS) {
    try {
      const parsed = await parser.parseURL(feed.url);
      for (const item of parsed.items.slice(0, ARTICLES_PER_FEED)) {
        if (existingUrls.has(item.link)) continue;
        console.log(`  ✅ [RSS] ${feed.source}: ${item.title?.slice(0, 50)}...`);
        articles.push({
          id: crypto.randomUUID(), source: feed.source, type: 'rss',
          title: item.title,
          summary: toThreeLines(item.contentSnippet || item.content || item.title),
          url: item.link,
          author: item.creator || feed.source,
          created_at: item.isoDate || new Date().toISOString(),
        });
      }
    } catch (e) { console.error(`  ❌ ${feed.source}: ${e.message}`); }
  }
  return articles;
}

// ─── Fetch Farcaster ───
async function fetchFarcaster(existingUrls) {
  const NEYNAR_KEY = process.env.NEYNAR_API_KEY;
  if (!NEYNAR_KEY) { console.log('  ⏭ No NEYNAR_API_KEY, skipping'); return []; }

  const articles = [];
  for (const fid of FARCASTER_FIDS) {
    try {
      const res = await fetch(`https://api.neynar.com/v2/farcaster/feed/user/${fid}/popular?limit=2`, {
        headers: { 'x-api-key': NEYNAR_KEY },
        signal: AbortSignal.timeout(10000),
      });
      const data = await res.json();
      for (const cast of (data.casts || [])) {
        const castUrl = `https://warpcast.com/${cast.author?.username || 'user'}/${cast.hash?.slice(0, 10)}`;
        if (existingUrls.has(castUrl)) continue;
        if (!cast.text || cast.text.length < 20) continue;

        const name = cast.author?.display_name || `FID:${fid}`;
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
    } catch (e) { console.error(`  ❌ Farcaster FID ${fid}: ${e.message}`); }
  }
  return articles;
}

// ─── Fetch Reddit ───
async function fetchReddit(existingUrls) {
  const articles = [];
  for (const sub of SUBREDDITS) {
    try {
      const res = await fetch(`https://www.reddit.com/r/${sub}/hot.json?limit=3`, {
        headers: { 'User-Agent': 'BreakingNews/1.0' },
        signal: AbortSignal.timeout(10000),
      });
      const data = await res.json();
      for (const { data: post } of (data?.data?.children || [])) {
        if (post.stickied) continue;
        const url = `https://reddit.com${post.permalink}`;
        if (existingUrls.has(url)) continue;

        console.log(`  ✅ [Reddit] r/${sub}: ${post.title?.slice(0, 50)}...`);
        articles.push({
          id: crypto.randomUUID(), source: `r/${sub}`, type: 'reddit',
          title: post.title,
          summary: toThreeLines(post.selftext || post.title),
          url,
          author: `u/${post.author}`,
          created_at: new Date(post.created_utc * 1000).toISOString(),
        });
      }
    } catch (e) { console.error(`  ❌ Reddit r/${sub}: ${e.message}`); }
  }
  return articles;
}

// ─── Fetch GitHub ───
async function fetchGitHub(existingUrls) {
  const articles = [];
  for (const repo of GITHUB_REPOS) {
    try {
      const res = await fetch(`https://api.github.com/repos/${repo}/releases?per_page=2`, {
        headers: { 'User-Agent': 'BreakingNews/1.0' },
        signal: AbortSignal.timeout(10000),
      });
      const releases = await res.json();
      if (!Array.isArray(releases)) continue;

      for (const release of releases) {
        const url = release.html_url;
        if (existingUrls.has(url)) continue;

        const title = `${repo}: ${release.name || release.tag_name}`;
        console.log(`  ✅ [GitHub] ${title.slice(0, 50)}...`);

        articles.push({
          id: crypto.randomUUID(), source: 'GitHub', type: 'github',
          title, summary: toThreeLines(release.body || title),
          url, author: release.author?.login || repo,
          created_at: release.published_at || new Date().toISOString(),
        });
      }
    } catch (e) { console.error(`  ❌ GitHub ${repo}: ${e.message}`); }
  }
  return articles;
}

// ─── Main ───
async function main() {
  const existing = await loadExisting();
  const existingUrls = new Set(existing.map(a => a.url));

  console.log(`\n📰 Breaking News — Feed Update (No AI, $0 cost)`);
  console.log(`📦 ${existing.length} existing articles\n`);

  console.log('🔵 RSS Feeds...');
  const rss = await fetchRSS(existingUrls);

  console.log('🟣 Farcaster...');
  const farcaster = await fetchFarcaster(existingUrls);

  console.log('🟠 Reddit...');
  const reddit = await fetchReddit(existingUrls);

  console.log('⚫ GitHub...');
  const github = await fetchGitHub(existingUrls);

  const allNew = [...rss, ...farcaster, ...reddit, ...github];
  const merged = dedup([...allNew, ...existing]);
  const fresh = removeOld(merged);
  fresh.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  await fs.writeFile(OUTPUT_PATH, JSON.stringify(fresh, null, 2));
  console.log(`\n🎉 Done! ${fresh.length} total (${allNew.length} new)`);
  console.log(`   RSS: ${rss.length} | Farcaster: ${farcaster.length} | Reddit: ${reddit.length} | GitHub: ${github.length}`);
}

main().catch(console.error);
