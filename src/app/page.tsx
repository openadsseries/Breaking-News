"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAccount, useConnect, useWriteContract } from 'wagmi';
import { signalTokenAbi } from '@/lib/abi';
import mockFeed from "@/data/mock-feed.json";

const READS_TO_CLAIM = 5;
const CONTRACT_ADDRESS = "0xe0475db34e1bf2c305c5aff2805bbd999a418ae2"; // BNDistributor v2
const APP_URL = "https://breaking-news-omega.vercel.app";
const SHARE_TEXT = `I just finished today's crypto briefing on Breaking News.\n\nRead 5 signals. Stay ahead of the market.\n\n${APP_URL}`;

// Session ID = first article ID
const SESSION_ID = mockFeed.length > 0 ? mockFeed[0].id : "empty";

type Phase = "READING" | "SHARE_GATE" | "CLAIMABLE" | "READING_CONTINUED" | "ALL_READ";

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [readCount, setReadCount] = useState(0);
  const [hasShared, setHasShared] = useState(false);
  const [claimedToday, setClaimedToday] = useState(false);
  const [saved, setSaved] = useState<Record<string, boolean>>({});

  const { isConnected } = useAccount();
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
        localStorage.removeItem("bn_index");
      } else {
        const rc = localStorage.getItem("bn_read_count");
        if (rc) setReadCount(parseInt(rc, 10));
        if (localStorage.getItem("bn_shared") === "true") setHasShared(true);
        const idx = localStorage.getItem("bn_index");
        if (idx) setCurrentIndex(parseInt(idx, 10));
      }
    } catch {}
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    import('@farcaster/miniapp-sdk').then((mod) => {
      mod.default.actions.ready();
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

  // Derived
  const totalArticles = mockFeed.length;
  const displayCount = Math.min(readCount, READS_TO_CLAIM);

  // Phase logic
  const phase: Phase = useMemo(() => {
    // Already read all articles
    if (currentIndex >= totalArticles) return "ALL_READ";
    // Hit 5 reads and haven't shared yet → gate
    if (readCount >= READS_TO_CLAIM && !hasShared && !claimedToday) return "SHARE_GATE";
    // Shared but haven't claimed → claimable
    if (readCount >= READS_TO_CLAIM && hasShared && !claimedToday) return "CLAIMABLE";
    // Shared and claimed (or already claimed today) → keep reading
    if (readCount >= READS_TO_CLAIM && (claimedToday || hasShared)) return currentIndex >= totalArticles ? "ALL_READ" : "READING_CONTINUED";
    return "READING";
  }, [readCount, hasShared, claimedToday, currentIndex, totalArticles]);

  const advanceArticle = useCallback(() => {
    if (currentIndex >= totalArticles - 1) {
      // Mark last article read
      const nc = readCount + 1;
      setReadCount(nc);
      localStorage.setItem("bn_read_count", String(nc));
      setCurrentIndex(totalArticles); // trigger ALL_READ
      localStorage.setItem("bn_index", String(totalArticles));
      return;
    }
    const nc = readCount + 1;
    setReadCount(nc);
    localStorage.setItem("bn_read_count", String(nc));
    const ni = currentIndex + 1;
    setCurrentIndex(ni);
    localStorage.setItem("bn_index", String(ni));
  }, [currentIndex, totalArticles, readCount]);

  const handleDragEnd = useCallback((e: any, { offset }: any) => {
    if (offset.x < -50) advanceArticle();
    else if (offset.x > 50 && currentIndex > 0) {
      const ni = currentIndex - 1;
      setCurrentIndex(ni);
      localStorage.setItem("bn_index", String(ni));
    }
  }, [currentIndex, advanceArticle]);

  const handleSave = useCallback(async (article: typeof mockFeed[0]) => {
    try {
      const sdk = await import('@farcaster/miniapp-sdk').catch(() => null);
      if (sdk?.default?.actions?.composeCast) {
        const result = await sdk.default.actions.composeCast({
          text: article.title,
          embeds: [APP_URL],
        });
        if (result) setSaved(prev => ({ ...prev, [article.id]: true }));
      } else if (navigator.share) {
        await navigator.share({ title: article.title, text: article.title, url: APP_URL });
        setSaved(prev => ({ ...prev, [article.id]: true }));
      }
    } catch {}
  }, []);

  const handleShare = useCallback(async () => {
    try {
      const sdk = await import('@farcaster/miniapp-sdk').catch(() => null);

      if (sdk?.default?.actions?.composeCast) {
        // composeCast returns result ONLY if user actually posts
        const result = await sdk.default.actions.composeCast({
          text: "I just finished today's crypto briefing on Breaking News.\n\nRead 5 signals. Stay ahead of the market.",
          embeds: [APP_URL],
        });

        // Only mark as shared if cast was actually published
        if (result) {
          setHasShared(true);
          localStorage.setItem("bn_shared", "true");
        }
        // If user cancelled, nothing happens → stays on SHARE_GATE
      } else if (navigator.share) {
        await navigator.share({ title: "Breaking News", text: SHARE_TEXT, url: APP_URL });
        setHasShared(true);
        localStorage.setItem("bn_shared", "true");
      }
    } catch {}
  }, []);

  const handleClaim = useCallback(() => {
    writeContract({ address: CONTRACT_ADDRESS, abi: signalTokenAbi, functionName: 'claim' });
  }, [writeContract]);

  const handleContinueReading = useCallback(() => {
    // After claiming, go back to reading from where we left off
    // Phase will resolve to READING_CONTINUED
    setHasShared(true);
    setClaimedToday(true);
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
              <p className="text-lg font-black uppercase tracking-tight">Briefing complete.</p>
              <p className="text-sm leading-relaxed">
                You&apos;re faster than 90% of readers.<br/>Share to unlock what&apos;s waiting for you.
              </p>
              <button onClick={handleShare}
                className="w-full border-[3px] border-[#1c1b18] py-4 text-sm font-black uppercase tracking-widest bg-[#1c1b18] text-[#dcdad2] active:bg-transparent active:text-[#1c1b18] transition-colors">
                Share to Unlock
              </button>
            </div>
          )}

          {phase === "CLAIMABLE" && (
            <div className="space-y-5">
              <p className="text-lg font-black uppercase tracking-tight">You earned it.</p>
              <p className="text-sm leading-relaxed">
                Not everyone finishes the briefing.<br/>You did. Here&apos;s what that&apos;s worth.
              </p>
              <button onClick={handleClaim} disabled={isPending}
                className="w-full border-[3px] border-[#1c1b18] py-4 text-sm font-black uppercase tracking-widest bg-[#1c1b18] text-[#dcdad2] active:bg-transparent active:text-[#1c1b18] transition-colors">
                {isPending ? "Processing..." : "Open Reward"}
              </button>
              {currentIndex < totalArticles && (
                <button onClick={handleContinueReading}
                  className="text-xs underline uppercase tracking-widest">
                  Skip &amp; keep reading
                </button>
              )}
            </div>
          )}

          {phase === "ALL_READ" && (
            <div className="space-y-3">
              <p className="text-lg font-black uppercase tracking-tight">
                {claimedToday ? "Reward collected." : "End of edition."}
              </p>
              <p className="text-sm leading-relaxed">Come back for the next edition.</p>
            </div>
          )}
        </div>
      </main>
    );
  }

  // ── ARTICLE VIEW (READING or READING_CONTINUED) ──
  const currentArticle = mockFeed[currentIndex];
  if (!currentArticle) return null;

  const isPostReward = phase === "READING_CONTINUED";

  return (
    <main className="fixed inset-0 bg-paper text-[#1c1b18] font-serif flex flex-col">
      <div className="w-full flex-1 max-w-lg mx-auto px-4 py-4 flex flex-col">

        <header className="shrink-0 mb-3">
          <div className="border-b-[4px] border-[#1c1b18] pb-2">
            <div className="flex justify-between items-end px-1 mb-1">
              <span className="text-[10px] uppercase font-sans tracking-widest font-bold">
                {isPostReward ? "Bonus reading" : readCount >= READS_TO_CLAIM ? "Reward waiting" : `${displayCount}/${READS_TO_CLAIM}`}
              </span>
              <span className="text-[10px] uppercase font-sans tracking-widest font-bold">
                {currentIndex + 1} of {totalArticles}
              </span>
            </div>
            <h1 className="text-2xl font-black uppercase tracking-tighter text-center" style={{ fontFamily: 'Georgia, serif' }}>
              Breaking News
            </h1>
          </div>
        </header>

        <div className="flex-1 relative w-full min-h-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentIndex}
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
                <span className="text-[10px] font-mono font-bold">
                  {new Date(currentArticle.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </span>
              </div>

              <div className="flex-1 px-4 py-4 flex flex-col min-h-0 overflow-y-auto">
                <h2 className="text-xl font-black leading-tight tracking-tight mb-4">
                  {currentArticle.title}
                </h2>
                <div className="border-t border-[#1c1b18] mb-4"></div>
                <div className="text-sm leading-relaxed space-y-3 flex-1">
                  {currentArticle.summary.split('\n').map((line, i) => {
                    const clean = line.replace(/^\d+\.\s*/, '');
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
                <span className="text-[10px] uppercase tracking-widest font-sans font-bold">← Swipe →</span>
                <button
                  onClick={() => handleSave(currentArticle)}
                  className={`text-[10px] uppercase tracking-widest font-sans font-bold px-3 py-1.5 border-[2px] border-[#1c1b18] transition-colors ${
                    saved[currentArticle.id]
                      ? "bg-[#1c1b18] text-[#dcdad2]"
                      : "bg-transparent hover:bg-[#1c1b18] hover:text-[#dcdad2]"
                  }`}>
                  {saved[currentArticle.id] ? "Saved" : "Save"}
                </button>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="mt-3 flex justify-center items-center gap-0.5 shrink-0">
          {mockFeed.slice(0, 15).map((_, i) => (
            <div key={i} className={`h-1 rounded-full transition-all duration-200 ${
              i === currentIndex ? "w-3 bg-[#1c1b18]" : i < currentIndex ? "w-1 bg-[#1c1b18]/50" : "w-1 bg-[#1c1b18]/15"
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
