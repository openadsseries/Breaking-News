"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useWriteContract } from 'wagmi';
import { signalTokenAbi } from '@/lib/abi';
import mockFeed from "@/data/mock-feed.json";

const READS_TO_CLAIM = 5;
const READ_TIME_MS = 5000;
const CONTRACT_ADDRESS = "0x1d705c7cb1bbe119f83f48520234f074e9157907";

export default function Home() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [readCount, setReadCount] = useState(0);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [shared, setShared] = useState<Record<string, boolean>>({});
  const [canClaim, setCanClaim] = useState(false);
  const [readProgress, setReadProgress] = useState(0);
  const [sdkReady, setSdkReady] = useState(false);

  const { isConnected } = useAccount();
  const { writeContract, isPending, isSuccess } = useWriteContract();

  // Initialize Farcaster SDK safely
  useEffect(() => {
    try {
      import('@farcaster/miniapp-sdk').then((mod) => {
        mod.default.actions.ready();
        setSdkReady(true);
      }).catch(() => {});
    } catch {}
  }, []);

  // Filter unread
  const unreadArticles = useMemo(() => {
    return mockFeed.filter(a => !readIds.has(a.id));
  }, [readIds]);

  // Load state
  useEffect(() => {
    try {
      const saved = localStorage.getItem("bn_read_ids");
      if (saved) {
        const ids = JSON.parse(saved);
        setReadIds(new Set(ids));
        setReadCount(ids.length);
      }
      const savedClaim = localStorage.getItem("bn_can_claim");
      if (savedClaim === "true") setCanClaim(true);
    } catch {}
  }, []);

  // Read timer (progress bar only, NO auto-advance)
  useEffect(() => {
    if (unreadArticles.length === 0) return;
    const currentArticle = unreadArticles[currentIndex];
    if (!currentArticle || readIds.has(currentArticle.id)) return;

    setReadProgress(0);

    const progressInterval = setInterval(() => {
      setReadProgress(prev => Math.min(prev + (100 / (READ_TIME_MS / 100)), 100));
    }, 100);

    const readTimer = setTimeout(() => {
      const newReadIds = new Set(readIds);
      newReadIds.add(currentArticle.id);
      setReadIds(newReadIds);
      localStorage.setItem("bn_read_ids", JSON.stringify([...newReadIds]));

      const newCount = readCount + 1;
      setReadCount(newCount);

      if (newCount >= READS_TO_CLAIM && !canClaim) {
        setCanClaim(true);
        localStorage.setItem("bn_can_claim", "true");
      }
    }, READ_TIME_MS);

    return () => {
      clearTimeout(readTimer);
      clearInterval(progressInterval);
    };
  }, [currentIndex, readIds, unreadArticles, readCount, canClaim]);

  // Claim success
  useEffect(() => {
    if (isSuccess) {
      setCanClaim(false);
      setReadCount(0);
      setReadIds(new Set());
      localStorage.removeItem("bn_read_ids");
      localStorage.removeItem("bn_can_claim");
    }
  }, [isSuccess]);

  const handleClaim = useCallback(() => {
    if (canClaim) {
      writeContract({
        address: CONTRACT_ADDRESS,
        abi: signalTokenAbi,
        functionName: 'claim',
      });
    }
  }, [canClaim, writeContract]);

  // Manual swipe only
  const handleDragEnd = useCallback((e: any, { offset }: any) => {
    if (unreadArticles.length === 0) return;
    const swipeThreshold = 50;
    if (offset.x < -swipeThreshold && currentIndex < unreadArticles.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else if (offset.x > swipeThreshold && currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  }, [currentIndex, unreadArticles.length]);

  const handleShare = useCallback(async (article: typeof mockFeed[0]) => {
    try {
      if (navigator.share) {
        await navigator.share({ title: article.title, text: "Breaking News: " + article.url, url: article.url });
      } else {
        await navigator.clipboard.writeText(`${article.title}\n${article.url}`);
      }
      if (!shared[article.id]) setShared(prev => ({ ...prev, [article.id]: true }));
    } catch {}
  }, [shared]);

  // ─── ALL CAUGHT UP (simple, no complex components) ───
  if (unreadArticles.length === 0) {
    return (
      <main className="fixed inset-0 bg-paper text-[#1c1b18] overflow-hidden font-serif flex flex-col items-center justify-center p-6">
        <div className="max-w-md text-center">
          <div className="text-6xl mb-6">📰</div>
          <h1 className="text-4xl font-black uppercase tracking-tighter mb-4" style={{ fontFamily: 'Georgia, serif' }}>
            Breaking News
          </h1>
          <div className="border-t-[3px] border-b-[3px] border-[#1c1b18] py-4 mb-6">
            <h2 className="text-2xl font-black uppercase tracking-tight mb-2">You&apos;re all caught up!</h2>
            <p className="text-base leading-relaxed">
              Fresh signals drop every hour.<br/>Come back soon for more alpha.
            </p>
          </div>

          {canClaim && (
            <div className="border-[3px] border-[#1c1b18] p-4 mb-4 bg-[#1c1b18] text-[#dcdad2]">
              <p className="text-sm font-bold uppercase tracking-widest mb-3">You earned 69 tokens!</p>
              {isConnected ? (
                <button
                  onClick={handleClaim}
                  disabled={isPending}
                  className="w-full border-[2px] border-[#dcdad2] py-2 text-sm font-black uppercase tracking-widest hover:bg-[#dcdad2] hover:text-[#1c1b18] transition-colors"
                >
                  {isPending ? "Claiming..." : "CLAIM NOW"}
                </button>
              ) : (
                <p className="text-xs">Connect wallet to claim →</p>
              )}
            </div>
          )}

          <p className="text-xs uppercase tracking-widest font-bold mt-4">
            {readCount} articles read today
          </p>
        </div>
      </main>
    );
  }

  // ─── ARTICLE VIEW ───
  const currentArticle = unreadArticles[currentIndex];
  const remaining = READS_TO_CLAIM - readCount;

  return (
    <main className="fixed inset-0 bg-paper text-[#1c1b18] overflow-hidden font-serif selection:bg-[#1c1b18] selection:text-[#dcdad2] flex flex-col items-center justify-center">
      <div className="w-full h-full max-w-2xl px-4 py-6 flex flex-col relative z-10">

        {/* Masthead */}
        <header className="border-b-[5px] border-[#1c1b18] pb-2 mb-3 flex flex-col items-center shrink-0">
          <div className="w-full flex justify-between items-end border-b-2 border-[#1c1b18] pb-1 mb-1 px-1">
            {/* Token earning info - always visible */}
            <span className="text-[10px] uppercase font-sans tracking-widest font-bold">
              {canClaim ? "✦ CLAIM READY" : `${readCount}/${READS_TO_CLAIM} → 69 Tokens`}
            </span>

            <ConnectButton.Custom>
              {({ account, chain, openChainModal, openConnectModal, openAccountModal, mounted }) => {
                const ready = mounted;
                const connected = ready && account && chain;
                return (
                  <div {...(!ready && { 'aria-hidden': true, style: { opacity: 0, pointerEvents: 'none', userSelect: 'none' } })}>
                    {(() => {
                      if (!connected) {
                        return (
                          <button onClick={openConnectModal} type="button" className="text-[10px] uppercase font-sans tracking-widest font-bold hover:bg-[#1c1b18] hover:text-[#dcdad2] px-1 transition-colors">
                            [ Connect Wallet ]
                          </button>
                        );
                      }
                      if (chain.unsupported) {
                        return (
                          <button onClick={openChainModal} type="button" className="text-[10px] uppercase font-sans tracking-widest font-bold hover:bg-[#1c1b18] hover:text-[#dcdad2] px-1 transition-colors">
                            [ Wrong network ]
                          </button>
                        );
                      }
                      return (
                        <button onClick={openAccountModal} type="button" className="text-[10px] uppercase font-sans tracking-widest font-bold hover:bg-[#1c1b18] hover:text-[#dcdad2] px-1 transition-colors">
                          {account.displayName}
                        </button>
                      );
                    })()}
                  </div>
                );
              }}
            </ConnectButton.Custom>
          </div>
          <h1 className="text-4xl sm:text-5xl font-black uppercase tracking-tighter mt-1 text-center" style={{ fontFamily: 'Georgia, serif', transform: 'scaleY(1.1)' }}>
            Breaking News
          </h1>
        </header>

        {/* Swipeable Content */}
        <div className="flex-1 relative w-full h-full">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0, rotateY: 90 }}
              animate={{ opacity: 1, rotateY: 0 }}
              exit={{ opacity: 0, rotateY: -90 }}
              transition={{ duration: 0.4, ease: "easeInOut" }}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.2}
              onDragEnd={handleDragEnd}
              style={{ transformOrigin: "left center" }}
              className="absolute inset-0 w-full h-full bg-paper border-[3px] border-[#1c1b18] p-4 sm:p-5 shadow-[6px_6px_0px_rgba(28,27,24,1)] flex flex-col cursor-grab active:cursor-grabbing overflow-hidden"
            >
              {/* Reading Progress */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-transparent">
                <motion.div className="h-full bg-[#1c1b18]" style={{ width: `${readProgress}%` }} />
              </div>

              {/* Source + Time */}
              <div className="flex justify-between items-center border-b-[3px] border-[#1c1b18] pb-1 mb-3 shrink-0 mt-1">
                <span className="font-bold text-sm uppercase tracking-tight bg-[#1c1b18] text-[#dcdad2] px-2 py-0.5">
                  {currentArticle.source}
                </span>
                <span className="font-mono text-xs font-bold border-2 border-[#1c1b18] px-1.5 py-0.5">
                  {new Date(currentArticle.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </span>
              </div>

              {/* Headline */}
              <h2 className="text-2xl sm:text-3xl font-black leading-tight tracking-tight mb-3 text-left shrink-0">
                {currentArticle.title}
              </h2>

              <div className="w-full border-t-[1.5px] border-[#1c1b18] mb-3 shrink-0"></div>

              {/* Summary */}
              <div className="flex-1 overflow-hidden flex flex-col justify-center">
                <div className="text-base sm:text-lg leading-snug font-medium text-left space-y-3">
                  {currentArticle.summary.split('\n').map((line, i) => {
                    const cleanLine = line.replace(/^\d+\.\s*/, '');
                    return (
                      <p key={i} className="relative pl-5">
                        <span className="absolute left-0 font-black text-lg">•</span>
                        {cleanLine}
                      </p>
                    );
                  })}
                </div>
              </div>

              {/* Buttons */}
              <div className="mt-auto shrink-0 w-full grid grid-cols-2 gap-3 pt-3 border-t-2 border-[#1c1b18]">
                <a href={currentArticle.url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-center w-full border-[3px] border-[#1c1b18] py-2.5 text-xs sm:text-sm font-black uppercase tracking-widest hover:bg-[#1c1b18] hover:text-[#dcdad2] transition-colors bg-transparent text-[#1c1b18]">
                  Read Full
                </a>
                <button onClick={() => handleShare(currentArticle)}
                  className={`flex items-center justify-center w-full border-[3px] border-[#1c1b18] py-2.5 text-xs sm:text-sm font-black uppercase tracking-widest transition-all ${
                    shared[currentArticle.id] ? "bg-[#1c1b18] text-[#dcdad2]" : "hover:bg-[#1c1b18] hover:text-[#dcdad2] bg-transparent text-[#1c1b18]"
                  }`}>
                  {shared[currentArticle.id] ? "Shared" : "Share"}
                </button>
              </div>

              {/* Claim banner */}
              {canClaim && isConnected && (
                <div className="mt-3 shrink-0 w-full">
                  <button onClick={handleClaim} disabled={isPending}
                    className="w-full border-[3px] border-[#1c1b18] py-3 text-lg font-black uppercase tracking-widest bg-[#1c1b18] text-[#dcdad2] hover:bg-transparent hover:text-[#1c1b18] transition-colors">
                    {isPending ? "Claiming..." : "CLAIM 69 TOKENS"}
                  </button>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer dots */}
        <div className="mt-4 flex justify-center items-center gap-1 shrink-0">
          {unreadArticles.map((_, i) => (
            <div key={i} className={`h-1.5 border border-[#1c1b18] transition-all duration-300 ${
              i === currentIndex ? "w-5 bg-[#1c1b18]" : "w-1.5 bg-transparent"
            }`} />
          ))}
        </div>
      </div>
    </main>
  );
}
