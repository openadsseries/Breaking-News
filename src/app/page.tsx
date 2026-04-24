"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAccount, useConnect, useWriteContract } from 'wagmi';
import { signalTokenAbi } from '@/lib/abi';
import mockFeed from "@/data/mock-feed.json";

const READS_TO_CLAIM = 5;
const CONTRACT_ADDRESS = "0x1d705c7cb1bbe119f83f48520234f074e9157907";

export default function Home() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [readCount, setReadCount] = useState(0);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [hasShared, setHasShared] = useState(false);
  const [canClaim, setCanClaim] = useState(false);

  const { isConnected, address } = useAccount();
  const { connect, connectors } = useConnect();
  const { writeContract, isPending, isSuccess } = useWriteContract();

  const readEnough = readCount >= READS_TO_CLAIM;

  // Farcaster SDK + auto-connect wallet
  useEffect(() => {
    import('@farcaster/miniapp-sdk').then((mod) => {
      mod.default.actions.ready();
    }).catch(() => {});

    // Auto-connect Farcaster wallet
    if (!isConnected && connectors.length > 0) {
      const fcConnector = connectors.find(c => c.id === 'farcasterMiniApp') || connectors[0];
      connect({ connector: fcConnector });
    }
  }, [isConnected, connectors, connect]);

  const unreadArticles = useMemo(() => mockFeed.filter(a => !readIds.has(a.id)), [readIds]);

  // Load state
  useEffect(() => {
    try {
      const saved = localStorage.getItem("bn_read_ids");
      if (saved) { const ids = JSON.parse(saved); setReadIds(new Set(ids)); setReadCount(ids.length); }
      if (localStorage.getItem("bn_shared") === "true") setHasShared(true);
      if (localStorage.getItem("bn_can_claim") === "true") setCanClaim(true);
    } catch {}
  }, []);

  // Claim success
  useEffect(() => {
    if (isSuccess) {
      setCanClaim(false); setHasShared(false); setReadCount(0); setReadIds(new Set());
      localStorage.removeItem("bn_read_ids"); localStorage.removeItem("bn_shared"); localStorage.removeItem("bn_can_claim");
    }
  }, [isSuccess]);

  const markCurrentAsRead = useCallback(() => {
    if (unreadArticles.length === 0) return;
    const article = unreadArticles[currentIndex];
    if (!article || readIds.has(article.id)) return;
    const newReadIds = new Set(readIds);
    newReadIds.add(article.id);
    setReadIds(newReadIds);
    localStorage.setItem("bn_read_ids", JSON.stringify([...newReadIds]));
    setReadCount(prev => prev + 1);
  }, [currentIndex, readIds, unreadArticles]);

  const handleDragEnd = useCallback((e: any, { offset }: any) => {
    if (unreadArticles.length === 0) return;
    if (offset.x < -50 && currentIndex < unreadArticles.length - 1) {
      markCurrentAsRead();
      setCurrentIndex(currentIndex + 1);
    } else if (offset.x > 50 && currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  }, [currentIndex, unreadArticles.length, markCurrentAsRead]);

  const handleShare = useCallback(async () => {
    const url = "https://breaking-news-omega.vercel.app";
    try {
      if (navigator.share) {
        await navigator.share({ title: "Breaking News", text: "Read crypto signals, earn tokens.", url });
      } else {
        await navigator.clipboard.writeText(`Breaking News — Read crypto signals, earn tokens.\n${url}`);
      }
      setHasShared(true);
      localStorage.setItem("bn_shared", "true");
      if (readCount >= READS_TO_CLAIM) {
        setCanClaim(true);
        localStorage.setItem("bn_can_claim", "true");
      }
    } catch {}
  }, [readCount]);

  const handleClaim = useCallback(() => {
    if (canClaim) {
      writeContract({ address: CONTRACT_ADDRESS, abi: signalTokenAbi, functionName: 'claim' });
    }
  }, [canClaim, writeContract]);

  // ─── ALL CAUGHT UP ───
  if (unreadArticles.length === 0) {
    return (
      <main className="fixed inset-0 bg-paper text-[#1c1b18] overflow-hidden font-serif flex flex-col items-center justify-center p-8">
        <div className="max-w-sm w-full text-center">
          <h1 className="text-3xl font-black uppercase tracking-tighter mb-6" style={{ fontFamily: 'Georgia, serif' }}>
            Breaking News
          </h1>
          <div className="border-t-[3px] border-[#1c1b18] mb-8"></div>

          {(() => {
            if (canClaim) {
              return (
                <div className="space-y-4">
                  <p className="text-lg font-black uppercase tracking-tight">
                    Your reward is ready.
                  </p>
                  <button onClick={handleClaim} disabled={isPending}
                    className="w-full border-[3px] border-[#1c1b18] py-4 text-base font-black uppercase tracking-widest bg-[#1c1b18] text-[#dcdad2] active:bg-transparent active:text-[#1c1b18] transition-colors">
                    {isPending ? "Processing..." : "Collect 69 Tokens"}
                  </button>
                  <p className="text-xs leading-relaxed">
                    Next edition within the hour.
                  </p>
                </div>
              );
            }

            if (readEnough && !hasShared) {
              return (
                <div className="space-y-4">
                  <p className="text-lg font-black uppercase tracking-tight">
                    That&apos;s the latest edition.
                  </p>
                  <p className="text-sm leading-relaxed">
                    Share to unlock your reward.
                  </p>
                  <button onClick={handleShare}
                    className="w-full border-[3px] border-[#1c1b18] py-4 text-base font-black uppercase tracking-widest bg-[#1c1b18] text-[#dcdad2] active:bg-transparent active:text-[#1c1b18] transition-colors">
                    Share
                  </button>
                </div>
              );
            }

            return (
              <div className="space-y-4">
                <p className="text-lg font-black uppercase tracking-tight">
                  That&apos;s the latest edition.
                </p>
                <p className="text-sm leading-relaxed">
                  Next edition within the hour.
                </p>
              </div>
            );
          })()}

          <p className="text-[10px] uppercase tracking-widest font-sans font-bold mt-8">
            {readCount} read
          </p>
        </div>
      </main>
    );
  }

  // ─── ARTICLE VIEW ───
  const currentArticle = unreadArticles[currentIndex];

  return (
    <main className="fixed inset-0 bg-paper text-[#1c1b18] overflow-hidden font-serif flex flex-col items-center justify-center">
      <div className="w-full h-full max-w-2xl px-4 py-5 flex flex-col relative z-10">

        {/* Masthead */}
        <header className="border-b-[4px] border-[#1c1b18] pb-2 mb-3 flex flex-col items-center shrink-0">
          <div className="w-full flex justify-between items-end border-b border-[#1c1b18] pb-1 mb-1 px-1">
            <span className="text-[10px] uppercase font-sans tracking-widest font-bold">
              {readCount}/{READS_TO_CLAIM}
            </span>
            <span className="text-[10px] uppercase font-sans tracking-widest font-bold">
              {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tighter mt-1" style={{ fontFamily: 'Georgia, serif' }}>
            Breaking News
          </h1>
        </header>

        {/* Article */}
        <div className="flex-1 relative w-full h-full">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0, x: 60 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -60 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.15}
              onDragEnd={handleDragEnd}
              className="absolute inset-0 w-full h-full bg-paper border-[3px] border-[#1c1b18] p-4 sm:p-5 shadow-[4px_4px_0px_rgba(28,27,24,1)] flex flex-col cursor-grab active:cursor-grabbing overflow-hidden"
            >
              {/* Source */}
              <div className="flex justify-between items-center border-b-[2px] border-[#1c1b18] pb-1 mb-3 shrink-0">
                <span className="font-bold text-xs uppercase tracking-tight bg-[#1c1b18] text-[#dcdad2] px-2 py-0.5">
                  {currentArticle.source}
                </span>
                <span className="font-mono text-[10px] font-bold">
                  {new Date(currentArticle.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </span>
              </div>

              {/* Headline */}
              <h2 className="text-xl sm:text-2xl font-black leading-tight tracking-tight mb-3 shrink-0">
                {currentArticle.title}
              </h2>

              <div className="w-full border-t border-[#1c1b18] mb-3 shrink-0"></div>

              {/* Summary */}
              <div className="flex-1 overflow-hidden flex flex-col justify-center">
                <div className="text-sm sm:text-base leading-relaxed font-medium space-y-2">
                  {currentArticle.summary.split('\n').map((line, i) => {
                    const cleanLine = line.replace(/^\d+\.\s*/, '');
                    return <p key={i} className="pl-4 border-l-2 border-[#1c1b18]">{cleanLine}</p>;
                  })}
                </div>
              </div>

              {/* Swipe hint */}
              <div className="mt-auto shrink-0 pt-3 border-t border-[#1c1b18] text-center">
                <p className="text-[10px] uppercase tracking-widest font-sans font-bold">
                  Swipe to continue
                </p>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Dots */}
        <div className="mt-3 flex justify-center items-center gap-1 shrink-0">
          {unreadArticles.slice(0, 10).map((_, i) => (
            <div key={i} className={`h-1 rounded-full transition-all duration-300 ${
              i === currentIndex ? "w-4 bg-[#1c1b18]" : "w-1 bg-[#1c1b18]/30"
            }`} />
          ))}
        </div>
      </div>
    </main>
  );
}
