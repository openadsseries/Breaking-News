"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAccount, useConnect, useWriteContract } from 'wagmi';
import { signalTokenAbi } from '@/lib/abi';
import mockFeed from "@/data/mock-feed.json";

const READS_TO_CLAIM = 5;
const CONTRACT_ADDRESS = "0x1d705c7cb1bbe119f83f48520234f074e9157907";

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [readCount, setReadCount] = useState(0);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [hasShared, setHasShared] = useState(false);
  const [canClaim, setCanClaim] = useState(false);
  const [saved, setSaved] = useState<Record<string, boolean>>({});

  const { isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { writeContract, isPending, isSuccess } = useWriteContract();

  const readEnough = readCount >= READS_TO_CLAIM;
  const unreadArticles = useMemo(() => mockFeed.filter(a => !readIds.has(a.id)), [readIds]);

  // ── ALL HOOKS FIRST (no early returns above) ──

  // 1. Load localStorage + mount
  useEffect(() => {
    try {
      const s = localStorage.getItem("bn_read_ids");
      if (s) { const ids = JSON.parse(s); setReadIds(new Set(ids)); setReadCount(ids.length); }
      if (localStorage.getItem("bn_shared") === "true") setHasShared(true);
      if (localStorage.getItem("bn_can_claim") === "true") setCanClaim(true);
    } catch {}
    setMounted(true);
  }, []);

  // 2. Farcaster SDK + auto-connect
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

  // 3. Claim success reset
  useEffect(() => {
    if (isSuccess) {
      setCanClaim(false); setHasShared(false); setReadCount(0); setReadIds(new Set()); setSaved({});
      localStorage.removeItem("bn_read_ids"); localStorage.removeItem("bn_shared"); localStorage.removeItem("bn_can_claim");
    }
  }, [isSuccess]);

  // 4. Callbacks
  const markCurrentAsRead = useCallback(() => {
    if (unreadArticles.length === 0) return;
    const article = unreadArticles[currentIndex];
    if (!article || readIds.has(article.id)) return;
    const nr = new Set(readIds); nr.add(article.id); setReadIds(nr);
    localStorage.setItem("bn_read_ids", JSON.stringify([...nr]));
    setReadCount(prev => prev + 1);
  }, [currentIndex, readIds, unreadArticles]);

  const handleDragEnd = useCallback((e: any, { offset }: any) => {
    if (unreadArticles.length === 0) return;
    if (offset.x < -50 && currentIndex < unreadArticles.length - 1) {
      markCurrentAsRead(); setCurrentIndex(currentIndex + 1);
    } else if (offset.x > 50 && currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  }, [currentIndex, unreadArticles.length, markCurrentAsRead]);

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
        await navigator.share({ title: "Breaking News", text: "Read crypto signals, earn tokens.", url });
      } else {
        await navigator.clipboard.writeText(`Breaking News — Read crypto signals, earn tokens.\n${url}`);
      }
      setHasShared(true); localStorage.setItem("bn_shared", "true");
      if (readCount >= READS_TO_CLAIM) { setCanClaim(true); localStorage.setItem("bn_can_claim", "true"); }
    } catch {}
  }, [readCount]);

  const handleClaim = useCallback(() => {
    if (canClaim) writeContract({ address: CONTRACT_ADDRESS, abi: signalTokenAbi, functionName: 'claim' });
  }, [canClaim, writeContract]);

  // ── NOW SAFE TO EARLY RETURN (all hooks are above) ──

  if (!mounted) {
    return (
      <main className="fixed inset-0 bg-paper text-[#1c1b18] font-serif flex flex-col items-center justify-center">
        <h1 className="text-2xl font-black uppercase tracking-tighter" style={{ fontFamily: 'Georgia, serif' }}>
          Breaking News
        </h1>
      </main>
    );
  }

  // ── END SCREEN ──
  if (unreadArticles.length === 0) {
    return (
      <main className="fixed inset-0 bg-paper text-[#1c1b18] font-serif flex flex-col items-center justify-center p-8">
        <div className="max-w-sm w-full text-center">
          <h1 className="text-3xl font-black uppercase tracking-tighter" style={{ fontFamily: 'Georgia, serif' }}>
            Breaking News
          </h1>
          <div className="border-t-[3px] border-[#1c1b18] mt-3 mb-6"></div>

          {(() => {
            if (canClaim) return (
              <div className="space-y-5">
                <p className="text-lg font-black uppercase tracking-tight">You earned it.</p>
                <p className="text-sm leading-relaxed">
                  Not everyone finishes the briefing.<br/>You did. Here&apos;s what that&apos;s worth.
                </p>
                <button onClick={handleClaim} disabled={isPending}
                  className="w-full border-[3px] border-[#1c1b18] py-4 text-sm font-black uppercase tracking-widest bg-[#1c1b18] text-[#dcdad2] active:bg-transparent active:text-[#1c1b18] transition-colors">
                  {isPending ? "Processing..." : "Open Reward"}
                </button>
                <p className="text-xs">Next edition arrives within the hour.</p>
              </div>
            );
            if (readEnough && !hasShared) return (
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
            );
            return (
              <div className="space-y-3">
                <p className="text-lg font-black uppercase tracking-tight">End of edition.</p>
                <p className="text-sm leading-relaxed">Next briefing drops within the hour.</p>
              </div>
            );
          })()}

          <p className="text-[10px] uppercase tracking-widest font-sans font-bold mt-8">{readCount} read</p>
        </div>
      </main>
    );
  }

  // ── ARTICLE VIEW ──
  const currentArticle = unreadArticles[currentIndex];

  return (
    <main className="fixed inset-0 bg-paper text-[#1c1b18] font-serif flex flex-col">
      <div className="w-full flex-1 max-w-lg mx-auto px-4 py-4 flex flex-col">

        <header className="shrink-0 mb-3">
          <div className="border-b-[4px] border-[#1c1b18] pb-2">
            <div className="flex justify-between items-end px-1 mb-1">
              <span className="text-[10px] uppercase font-sans tracking-widest font-bold">{readCount}/{READS_TO_CLAIM}</span>
              <span className="text-[10px] uppercase font-sans tracking-widest font-bold">
                {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
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
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -80 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
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

        <div className="mt-3 flex justify-center items-center gap-1 shrink-0">
          {unreadArticles.slice(0, 12).map((_, i) => (
            <div key={i} className={`h-1 rounded-full transition-all duration-200 ${
              i === currentIndex ? "w-4 bg-[#1c1b18]" : "w-1 bg-[#1c1b18]/25"
            }`} />
          ))}
          {unreadArticles.length > 12 && (
            <span className="text-[8px] font-sans font-bold ml-1">+{unreadArticles.length - 12}</span>
          )}
        </div>
      </div>
    </main>
  );
}
