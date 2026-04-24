"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAccount, useConnect, useWriteContract } from 'wagmi';
import { signalTokenAbi } from '@/lib/abi';
import mockFeed from "@/data/mock-feed.json";

const READS_TO_CLAIM = 5;
const CONTRACT_ADDRESS = "0x1d705c7cb1bbe119f83f48520234f074e9157907";

// Session ID = first article ID. When cron fetches new articles, session resets.
const SESSION_ID = mockFeed.length > 0 ? mockFeed[0].id : "empty";

type AppState = "READING" | "SHARE_GATE" | "CLAIMABLE" | "DONE" | "NO_REWARD";

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [readCount, setReadCount] = useState(0);
  const [hasShared, setHasShared] = useState(false);
  const [claimed, setClaimed] = useState(false);
  const [saved, setSaved] = useState<Record<string, boolean>>({});

  const { isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { writeContract, isPending, isSuccess } = useWriteContract();

  // ── ALL HOOKS ──

  // 1. Load session
  useEffect(() => {
    try {
      const savedSession = localStorage.getItem("bn_session");
      if (savedSession !== SESSION_ID) {
        // New edition → reset everything
        localStorage.setItem("bn_session", SESSION_ID);
        localStorage.removeItem("bn_read_count");
        localStorage.removeItem("bn_shared");
        localStorage.removeItem("bn_claimed");
      } else {
        const rc = localStorage.getItem("bn_read_count");
        if (rc) setReadCount(parseInt(rc, 10));
        if (localStorage.getItem("bn_shared") === "true") setHasShared(true);
        if (localStorage.getItem("bn_claimed") === "true") setClaimed(true);
      }
    } catch {}
    setMounted(true);
  }, []);

  // 2. Farcaster + auto-connect
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

  // 3. Claim success
  useEffect(() => {
    if (isSuccess) {
      setClaimed(true);
      localStorage.setItem("bn_claimed", "true");
    }
  }, [isSuccess]);

  // Derived state
  const readEnough = readCount >= READS_TO_CLAIM;
  const displayCount = Math.min(readCount, READS_TO_CLAIM);
  const totalArticles = mockFeed.length;

  // Determine app state
  const appState: AppState = useMemo(() => {
    if (claimed) return "DONE";
    if (hasShared && readEnough) return "CLAIMABLE";
    // Only show share gate when user reaches the end of ALL articles
    if (currentIndex >= totalArticles - 1 && readEnough && !hasShared) return "SHARE_GATE";
    if (currentIndex >= totalArticles - 1 && !readEnough) return "NO_REWARD";
    return "READING";
  }, [claimed, hasShared, readEnough, currentIndex, totalArticles]);

  // 4. Callbacks
  const advanceArticle = useCallback(() => {
    if (currentIndex >= totalArticles - 1) return;

    // Count this read
    const newCount = readCount + 1;
    setReadCount(newCount);
    localStorage.setItem("bn_read_count", String(newCount));

    setCurrentIndex(currentIndex + 1);
  }, [currentIndex, totalArticles, readCount]);

  const handleDragEnd = useCallback((e: any, { offset }: any) => {
    if (offset.x < -50) {
      advanceArticle();
    } else if (offset.x > 50 && currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  }, [currentIndex, advanceArticle]);

  const handleSave = useCallback(async (article: typeof mockFeed[0]) => {
    const url = "https://breaking-news-omega.vercel.app";
    try {
      if (navigator.share) {
        await navigator.share({ title: article.title, text: article.title, url });
      } else {
        await navigator.clipboard.writeText(`${article.title}\n${url}`);
      }
      setSaved(prev => ({ ...prev, [article.id]: true }));
    } catch {}
  }, []);

  const handleShareApp = useCallback(async () => {
    const url = "https://breaking-news-omega.vercel.app";
    try {
      if (navigator.share) {
        await navigator.share({ title: "Breaking News", text: "Stay ahead. Read the signals.", url });
      } else {
        await navigator.clipboard.writeText(`Breaking News — Stay ahead. Read the signals.\n${url}`);
      }
      setHasShared(true);
      localStorage.setItem("bn_shared", "true");
    } catch {}
  }, []);

  const handleClaim = useCallback(() => {
    writeContract({ address: CONTRACT_ADDRESS, abi: signalTokenAbi, functionName: 'claim' });
  }, [writeContract]);

  // ── EARLY RETURNS (all hooks above) ──

  if (!mounted) {
    return (
      <main className="fixed inset-0 bg-paper text-[#1c1b18] font-serif flex items-center justify-center">
        <h1 className="text-2xl font-black uppercase tracking-tighter" style={{ fontFamily: 'Georgia, serif' }}>
          Breaking News
        </h1>
      </main>
    );
  }

  // ── END SCREENS ──
  if (appState === "DONE" || appState === "CLAIMABLE" || appState === "SHARE_GATE" || appState === "NO_REWARD") {
    return (
      <main className="fixed inset-0 bg-paper text-[#1c1b18] font-serif flex items-center justify-center p-8">
        <div className="max-w-sm w-full text-center">
          <h1 className="text-3xl font-black uppercase tracking-tighter" style={{ fontFamily: 'Georgia, serif' }}>
            Breaking News
          </h1>
          <div className="border-t-[3px] border-[#1c1b18] mt-3 mb-8"></div>

          {appState === "SHARE_GATE" && (
            <div className="space-y-5">
              <p className="text-lg font-black uppercase tracking-tight">Briefing complete.</p>
              <p className="text-sm leading-relaxed">
                You&apos;re faster than 90% of readers.<br/>Share to unlock what&apos;s waiting for you.
              </p>
              <button onClick={handleShareApp}
                className="w-full border-[3px] border-[#1c1b18] py-4 text-sm font-black uppercase tracking-widest bg-[#1c1b18] text-[#dcdad2] active:bg-transparent active:text-[#1c1b18] transition-colors">
                Share to Unlock
              </button>
            </div>
          )}

          {appState === "CLAIMABLE" && (
            <div className="space-y-5">
              <p className="text-lg font-black uppercase tracking-tight">You earned it.</p>
              <p className="text-sm leading-relaxed">
                Not everyone finishes the briefing.<br/>You did. Here&apos;s what that&apos;s worth.
              </p>
              <button onClick={handleClaim} disabled={isPending}
                className="w-full border-[3px] border-[#1c1b18] py-4 text-sm font-black uppercase tracking-widest bg-[#1c1b18] text-[#dcdad2] active:bg-transparent active:text-[#1c1b18] transition-colors">
                {isPending ? "Processing..." : "Open Reward"}
              </button>
            </div>
          )}

          {appState === "DONE" && (
            <div className="space-y-3">
              <p className="text-lg font-black uppercase tracking-tight">Reward collected.</p>
              <p className="text-sm leading-relaxed">Come back for the next edition within the hour.</p>
            </div>
          )}

          {appState === "NO_REWARD" && (
            <div className="space-y-3">
              <p className="text-lg font-black uppercase tracking-tight">End of edition.</p>
              <p className="text-sm leading-relaxed">Next briefing drops within the hour.</p>
            </div>
          )}
        </div>
      </main>
    );
  }

  // ── READING STATE ──
  const currentArticle = mockFeed[currentIndex];
  if (!currentArticle) return null;

  return (
    <main className="fixed inset-0 bg-paper text-[#1c1b18] font-serif flex flex-col">
      <div className="w-full flex-1 max-w-lg mx-auto px-4 py-4 flex flex-col">

        {/* Header */}
        <header className="shrink-0 mb-3">
          <div className="border-b-[4px] border-[#1c1b18] pb-2">
            <div className="flex justify-between items-end px-1 mb-1">
              <span className="text-[10px] uppercase font-sans tracking-widest font-bold">
                {readEnough ? "Reward waiting" : `${displayCount}/${READS_TO_CLAIM}`}
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

        {/* Article */}
        <div className="flex-1 relative w-full min-h-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0, x: 80 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -80 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.12}
              onDragEnd={handleDragEnd}
              className="absolute inset-0 bg-paper border-[2px] border-[#1c1b18] shadow-[3px_3px_0px_rgba(28,27,24,0.8)] flex flex-col cursor-grab active:cursor-grabbing overflow-hidden"
            >
              {/* Source */}
              <div className="flex justify-between items-center border-b-[2px] border-[#1c1b18] px-4 py-2 shrink-0">
                <span className="text-[10px] font-bold uppercase tracking-widest bg-[#1c1b18] text-[#dcdad2] px-2 py-0.5">
                  {currentArticle.source}
                </span>
                <span className="text-[10px] font-mono font-bold">
                  {new Date(currentArticle.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </span>
              </div>

              {/* Content */}
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
              </div>

              {/* Footer */}
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

        {/* Progress dots */}
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
