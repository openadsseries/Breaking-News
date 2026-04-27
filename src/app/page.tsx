"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAccount, useConnect, useWriteContract } from 'wagmi';
import { distributorAbi } from '@/lib/abi';
import mockFeed from "@/data/mock-feed.json";

const READS_TO_CLAIM = 5;
const CONTRACT_ADDRESS = "0x9e6ea0c8871287d2d4c83d1e5c0602bbe0b97a82"; // BNDistributor v3
const APP_URL = "https://breaking-news-omega.vercel.app";
const SHARE_TEXT = `* read it before warren buffett does.\n\n${APP_URL}`;

// Session ID = first article ID
const SESSION_ID = mockFeed.length > 0 ? mockFeed[0].id : "empty";

type Phase = "READING" | "SHARE_GATE" | "CLAIMABLE" | "READING_CONTINUED" | "ALL_READ";

const GLOBAL_SHARE_VARIANTS = [
  "* read it before warren buffett does.",
  "the signal is out. the market just hasn’t reacted yet.",
  "Breaking News - Read Now."
];

const ARTICLE_SHARE_VARIANTS = [
  "Caught this early on Breaking News - {title}",
  "Read it first on Breaking News - {title}",
  "Breaking News - {title}"
];

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [readCount, setReadCount] = useState(0);
  const [hasShared, setHasShared] = useState(false);
  const [claimedToday, setClaimedToday] = useState(false);
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const [fid, setFid] = useState<string | null>(null);

  const { isConnected, address } = useAccount();
  const { connect, connectors } = useConnect();
  const { writeContract, isPending, isSuccess } = useWriteContract();

  // ── ALL HOOKS ──

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    try {
      if (localStorage.getItem("bn_claim_date") === today) setClaimedToday(true);

      const savedSession = localStorage.getItem("bn_session");
      if (savedSession !== SESSION_ID) {
        localStorage.setItem("bn_session", SESSION_ID);
        localStorage.removeItem("bn_read_count");
        localStorage.removeItem("bn_shared");
        localStorage.removeItem("bn_read_ids");
      } else {
        const rc = localStorage.getItem("bn_read_count");
        if (rc) setReadCount(parseInt(rc, 10));
        if (localStorage.getItem("bn_shared") === "true") setHasShared(true);
        const ids = localStorage.getItem("bn_read_ids");
        if (ids) setReadIds(new Set(JSON.parse(ids)));
      }
    } catch {}
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    import('@farcaster/miniapp-sdk').then(async (mod) => {
      mod.default.actions.ready();
      // Get user's FID for claim verification
      try {
        const ctx = await mod.default.context;
        if (ctx?.user?.fid) {
          setFid(String(ctx.user.fid));
        }
      } catch {}
    }).catch(() => {});
    if (!isConnected && connectors.length > 0) {
      const fc = connectors.find(c => c.id === 'farcasterMiniApp') || connectors[0];
      connect({ connector: fc });
    }
  }, [mounted, isConnected, connectors, connect]);

  useEffect(() => {
    if (isSuccess) {
      setClaimedToday(true);
      const today = new Date().toISOString().slice(0, 10);
      localStorage.setItem("bn_claim_date", today);
    }
  }, [isSuccess]);

  // Filter: only show UNREAD articles from the last 6 hours, newest first
  const todaysFeed = useMemo(() => {
    const cutoff = Date.now() - 6 * 60 * 60 * 1000;
    return mockFeed
      .filter(a => new Date(a.created_at).getTime() > cutoff && !readIds.has(a.id))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [readIds]);

  // Derived
  const totalArticles = todaysFeed.length;
  const displayCount = Math.min(readCount, READS_TO_CLAIM);

  // Phase logic
  const phase: Phase = useMemo(() => {
    if (totalArticles === 0) return "ALL_READ";
    if (readCount >= READS_TO_CLAIM && !hasShared && !claimedToday) return "SHARE_GATE";
    if (readCount >= READS_TO_CLAIM && hasShared && !claimedToday) return "CLAIMABLE";
    if (readCount >= READS_TO_CLAIM && (claimedToday || hasShared)) return totalArticles === 0 ? "ALL_READ" : "READING_CONTINUED";
    return "READING";
  }, [readCount, hasShared, claimedToday, totalArticles]);

  const advanceArticle = useCallback(() => {
    const currentArticle = todaysFeed[0];
    if (!currentArticle) return;
    const nc = readCount + 1;
    setReadCount(nc);
    localStorage.setItem("bn_read_count", String(nc));
    setReadIds(prev => {
      const next = new Set(prev);
      next.add(currentArticle.id);
      localStorage.setItem("bn_read_ids", JSON.stringify([...next]));
      return next;
    });
  }, [todaysFeed, readCount]);

  const handleDragEnd = useCallback((e: any, { offset }: any) => {
    if (offset.x < -50) advanceArticle();
  }, [advanceArticle]);

  const handleSave = useCallback(async (article: typeof mockFeed[0]) => {
    try {
      const sdk = await import('@farcaster/miniapp-sdk').catch(() => null);
      if (sdk?.default?.actions?.composeCast) {
        const template = ARTICLE_SHARE_VARIANTS[Math.floor(Math.random() * ARTICLE_SHARE_VARIANTS.length)];
        const text = template.replace("{title}", article.title);
        const result = await sdk.default.actions.composeCast({
          text,
          embeds: [APP_URL],
        });
        if (result) setSaved(prev => ({ ...prev, [article.id]: true }));
      } else if (navigator.share) {
        const template = ARTICLE_SHARE_VARIANTS[Math.floor(Math.random() * ARTICLE_SHARE_VARIANTS.length)];
        const text = template.replace("{title}", article.title);
        await navigator.share({ title: "Breaking News", text, url: APP_URL });
        setSaved(prev => ({ ...prev, [article.id]: true }));
      }
    } catch {}
  }, []);

  const handleShare = useCallback(async () => {
    try {
      const sdk = await import('@farcaster/miniapp-sdk').catch(() => null);

      if (sdk?.default?.actions?.composeCast) {
        // composeCast returns result ONLY if user actually posts
        const text = GLOBAL_SHARE_VARIANTS[Math.floor(Math.random() * GLOBAL_SHARE_VARIANTS.length)];
        const result = await sdk.default.actions.composeCast({
          text,
          embeds: [APP_URL],
        });

        // Only mark as shared if cast was actually published
        if (result) {
          setHasShared(true);
          localStorage.setItem("bn_shared", "true");
        }
        // If user cancelled, nothing happens → stays on SHARE_GATE
      } else if (navigator.share) {
        const text = GLOBAL_SHARE_VARIANTS[Math.floor(Math.random() * GLOBAL_SHARE_VARIANTS.length)];
        await navigator.share({ title: "Breaking News", text, url: APP_URL });
        setHasShared(true);
        localStorage.setItem("bn_shared", "true");
      }
    } catch {}
  }, []);

  const [claimError, setClaimError] = useState<string | null>(null);

  const handleClaim = useCallback(async () => {
    if (!address) return;
    setClaimError(null);
    try {
      // 1. Get server signature (verifies FID + Neynar score)
      const params = new URLSearchParams({ address });
      if (fid) params.set('fid', fid);
      const res = await fetch(`/api/claim-signature?${params}`);
      const data = await res.json();
      if (!data.signature) {
        setClaimError(data.error || "Verification failed");
        return;
      }

      // 2. Call contract with verified signature
      writeContract({
        address: CONTRACT_ADDRESS,
        abi: distributorAbi,
        functionName: 'claim',
        args: [data.signature],
      });
    } catch {
      setClaimError("Something went wrong. Try again.");
    }
  }, [address, fid, writeContract]);

  const handleContinueReading = useCallback(() => {
    // User chose to skip reward — treat as claimed so interstitial won't block
    setHasShared(true);
    setClaimedToday(true);
    const today = new Date().toISOString().slice(0, 10);
    localStorage.setItem("bn_claim_date", today);
  }, []);

  // ── RENDERS ──

  if (!mounted) {
    return (
      <main className="fixed inset-0 bg-paper text-[#1c1b18] font-serif flex items-center justify-center">
        <h1 className="text-2xl font-black uppercase tracking-tighter" style={{ fontFamily: 'Georgia, serif' }}>
          Breaking News
        </h1>
      </main>
    );
  }

  // ── INTERSTITIAL SCREENS ──
  if (phase === "SHARE_GATE" || phase === "CLAIMABLE" || phase === "ALL_READ") {
    return (
      <main className="fixed inset-0 bg-paper text-[#1c1b18] font-serif flex items-center justify-center p-8">
        <div className="max-w-sm w-full text-center">
          <h1 className="text-3xl font-black uppercase tracking-tighter" style={{ fontFamily: 'Georgia, serif' }}>
            Breaking News
          </h1>
          <div className="border-t-[3px] border-[#1c1b18] mt-3 mb-8"></div>

          {phase === "SHARE_GATE" && (
            <div className="space-y-5">
              <p className="text-lg font-black uppercase tracking-tight">You read it first.</p>
              <p className="text-sm leading-relaxed">
                Most people will see this tomorrow.<br/>You saw it now. Spread the word.
              </p>
              <button onClick={handleShare}
                className="w-full border-[3px] border-[#1c1b18] py-4 text-sm font-black uppercase tracking-widest bg-[#1c1b18] text-[#dcdad2] active:bg-transparent active:text-[#1c1b18] transition-colors">
                Share to Unlock 69 $BREAKINGNEWS
              </button>
            </div>
          )}

          {phase === "CLAIMABLE" && (
            <div className="space-y-5">
              <p className="text-lg font-black uppercase tracking-tight">You earned it.</p>
              <p className="text-sm leading-relaxed">
                You read it before everyone else.<br/>Here&apos;s what that&apos;s worth.
              </p>
              <button onClick={handleClaim} disabled={isPending}
                className="w-full border-[3px] border-[#1c1b18] py-4 text-sm font-black uppercase tracking-widest bg-[#1c1b18] text-[#dcdad2] active:bg-transparent active:text-[#1c1b18] transition-colors">
                {isPending ? "Processing..." : "Open Reward"}
              </button>
              {claimError && (
                <p className="text-xs text-red-700 text-center">{claimError}</p>
              )}
              {totalArticles > 0 && (
                <button onClick={handleContinueReading}
                  className="text-xs underline uppercase tracking-widest">
                  Skip &amp; keep reading
                </button>
              )}
            </div>
          )}

          {phase === "ALL_READ" && (
            <div className="space-y-5">
              <p className="text-lg font-black uppercase tracking-tight">You read it first.</p>
              <p className="text-sm leading-relaxed">
                You&apos;ve read every breaking story before most people even woke up.<br/>Now help someone else stay ahead.
              </p>
              <button onClick={handleShare}
                className="w-full border-[3px] border-[#1c1b18] py-4 text-sm font-black uppercase tracking-widest bg-[#1c1b18] text-[#dcdad2] active:bg-transparent active:text-[#1c1b18] transition-colors">
                Share Breaking News
              </button>
            </div>
          )}
        </div>
      </main>
    );
  }

  // ── ARTICLE VIEW (READING or READING_CONTINUED) ──
  const currentArticle = todaysFeed[0];
  if (!currentArticle) return null;

  const isPostReward = phase === "READING_CONTINUED";

  return (
    <main className="fixed inset-0 bg-paper text-[#1c1b18] font-serif flex flex-col">
      <div className="w-full flex-1 max-w-lg mx-auto px-4 py-4 flex flex-col">

        <header className="shrink-0 mb-2">
          <div className="border-b-[4px] border-[#1c1b18] pb-1">
            <h1 className="text-4xl font-black uppercase tracking-tighter text-center leading-none" style={{ fontFamily: 'Georgia, serif' }}>
              Breaking News
            </h1>
            <div className="flex justify-between items-end px-1 mt-1">
              <span className="text-[10px] uppercase font-sans tracking-widest font-bold">
                {isPostReward ? "Keep reading" : readCount >= READS_TO_CLAIM ? "⚡ Claim now" : `${displayCount}/${READS_TO_CLAIM}`}
              </span>
              <span className="text-[10px] uppercase font-sans tracking-widest font-bold">
                {totalArticles} left
              </span>
            </div>
          </div>
        </header>

        <div className="flex-1 relative w-full min-h-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentArticle.id}
              initial={{ opacity: 0, x: 80 }}
              animate={{ opacity: 1, x: [0, -6, 3, 0] }}
              exit={{ opacity: 0, x: -80 }}
              transition={{ duration: 0.4, ease: "easeOut", x: { duration: 0.5, times: [0, 0.5, 0.75, 1] } }}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.12}
              onDragEnd={handleDragEnd}
              className="absolute inset-0 bg-paper border-[2px] border-[#1c1b18] shadow-[3px_3px_0px_rgba(28,27,24,0.8)] flex flex-col cursor-grab active:cursor-grabbing overflow-hidden"
            >
              <div className="flex justify-between items-center border-b-[2px] border-[#1c1b18] px-4 py-2 shrink-0">
                <span className="text-[10px] font-bold uppercase tracking-widest bg-[#1c1b18] text-[#dcdad2] px-2 py-0.5">
                  {currentArticle.source}
                </span>
                {(() => {
                  const diff = Date.now() - new Date(currentArticle.created_at).getTime();
                  const hrs = diff / 3600000;
                  if (hrs < 1) return (
                    <span className="text-[10px] font-mono font-black uppercase tracking-widest bg-red-700 text-white px-2 py-0.5">
                      ● Just In
                    </span>
                  );
                  return (
                    <span className="text-[10px] font-mono font-bold uppercase tracking-widest">
                      ⚡ Developing
                    </span>
                  );
                })()}
              </div>

              <div className="flex-1 px-4 py-4 flex flex-col min-h-0 overflow-y-auto">
                <h2 className="text-xl font-black leading-tight tracking-tight mb-4">
                  {currentArticle.title}
                </h2>
                <div className="border-t border-[#1c1b18] mb-4"></div>
                <div className="text-sm leading-relaxed space-y-3 flex-1">
                  {currentArticle.summary.split('\n').map((line, i) => {
                    const clean = line.replace(/^\d+\.\s*/, '');
                    // Replace [...] with clickable link
                    if (clean.includes('[...]') || clean.includes('[…]')) {
                      const parts = clean.split(/\[\.{3}\]|\[…\]/);
                      return (
                        <p key={i} className="pl-3 border-l-2 border-[#1c1b18]">
                          {parts[0]}
                          <button
                            onClick={async () => {
                              try {
                                const sdk = await import('@farcaster/miniapp-sdk').catch(() => null);
                                if (sdk?.default?.actions?.openUrl) sdk.default.actions.openUrl(currentArticle.url);
                                else window.open(currentArticle.url, '_blank');
                              } catch { window.open(currentArticle.url, '_blank'); }
                            }}
                            className="underline underline-offset-2 font-bold"
                          >read more →</button>
                        </p>
                      );
                    }
                    return <p key={i} className="pl-3 border-l-2 border-[#1c1b18]">{clean}</p>;
                  })}
                </div>
                {currentArticle.url && (
                  <button
                    onClick={async () => {
                      try {
                        const sdk = await import('@farcaster/miniapp-sdk').catch(() => null);
                        if (sdk?.default?.actions?.openUrl) {
                          sdk.default.actions.openUrl(currentArticle.url);
                        } else {
                          window.open(currentArticle.url, '_blank');
                        }
                      } catch { window.open(currentArticle.url, '_blank'); }
                    }}
                    className="mt-4 text-[10px] uppercase tracking-widest font-sans font-bold underline underline-offset-2 self-start"
                  >
                    Read original →
                  </button>
                )}
              </div>

              <div className="shrink-0 border-t-[2px] border-[#1c1b18] px-4 py-3 flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-widest font-sans font-bold">Swipe →</span>
                <button
                  onClick={() => handleSave(currentArticle)}
                  className={`text-[10px] uppercase tracking-widest font-sans font-bold px-3 py-1.5 border-[2px] border-[#1c1b18] transition-colors ${
                    saved[currentArticle.id]
                      ? "bg-[#1c1b18] text-[#dcdad2]"
                      : "bg-transparent hover:bg-[#1c1b18] hover:text-[#dcdad2]"
                  }`}>
                  {saved[currentArticle.id] ? "Casted ✓" : "Cast"}
                </button>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="mt-3 flex justify-center items-center gap-0.5 shrink-0">
          {todaysFeed.slice(0, 15).map((a, i) => (
            <div key={a.id} className={`h-1 rounded-full transition-all duration-200 ${
              i === 0 ? "w-3 bg-[#1c1b18]" : "w-1 bg-[#1c1b18]/15"
            }`} />
          ))}
          {totalArticles > 15 && (
            <span className="text-[8px] font-sans font-bold ml-1">+{totalArticles - 15}</span>
          )}
        </div>
      </div>
    </main>
  );
}
