"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useWriteContract } from 'wagmi';
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

  const { isConnected } = useAccount();
  const { writeContract, isPending, isSuccess } = useWriteContract();

  // Derived state
  const readEnough = readCount >= READS_TO_CLAIM;

  // Farcaster SDK
  useEffect(() => {
    try {
      import('@farcaster/miniapp-sdk').then((mod) => {
        mod.default.actions.ready();
      }).catch(() => {});
    } catch {}
  }, []);

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
      if (localStorage.getItem("bn_shared") === "true") setHasShared(true);
      if (localStorage.getItem("bn_can_claim") === "true") setCanClaim(true);
    } catch {}
  }, []);

  // Claim success → reset
  useEffect(() => {
    if (isSuccess) {
      setCanClaim(false);
      setHasShared(false);
      setReadCount(0);
      setReadIds(new Set());
      localStorage.removeItem("bn_read_ids");
      localStorage.removeItem("bn_shared");
      localStorage.removeItem("bn_can_claim");
    }
  }, [isSuccess]);

  // Mark read on swipe
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

  const handleClaim = useCallback(() => {
    if (canClaim) {
      writeContract({
        address: CONTRACT_ADDRESS,
        abi: signalTokenAbi,
        functionName: 'claim',
      });
    }
  }, [canClaim, writeContract]);

  // Swipe left → read + advance. Swipe right → go back.
  const handleDragEnd = useCallback((e: any, { offset }: any) => {
    if (unreadArticles.length === 0) return;
    if (offset.x < -50 && currentIndex < unreadArticles.length - 1) {
      markCurrentAsRead();
      setCurrentIndex(currentIndex + 1);
    } else if (offset.x > 50 && currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  }, [currentIndex, unreadArticles.length, markCurrentAsRead]);

  // Share → unlocks reward
  const handleShare = useCallback(async () => {
    const shareUrl = "https://breaking-news-omega.vercel.app";
    const shareText = "Breaking News — Read crypto signals, earn tokens.";
    try {
      if (navigator.share) {
        await navigator.share({ title: "Breaking News", text: shareText, url: shareUrl });
      } else {
        await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
      }
      setHasShared(true);
      localStorage.setItem("bn_shared", "true");

      // Read enough + shared → can claim
      if (readCount >= READS_TO_CLAIM) {
        setCanClaim(true);
        localStorage.setItem("bn_can_claim", "true");
      }
    } catch {}
  }, [readCount]);

  // ─── ALL CAUGHT UP ───
  if (unreadArticles.length === 0) {
    return (
      <main className="fixed inset-0 bg-paper text-[#1c1b18] overflow-hidden font-serif flex flex-col items-center justify-center p-6">
        <div className="max-w-md text-center">
          <h1 className="text-4xl font-black uppercase tracking-tighter mb-2" style={{ fontFamily: 'Georgia, serif', transform: 'scaleY(1.1)' }}>
            Breaking News
          </h1>
          <div className="border-t-[3px] border-[#1c1b18] my-4"></div>

          {/* State 1: Read enough but haven't shared yet */}
          {readEnough && !hasShared && (
            <>
              <p className="text-xl font-black uppercase tracking-tight mb-2">
                That&apos;s the latest edition.
              </p>
              <p className="text-sm leading-relaxed mb-6">
                Share Breaking News to unlock your reward.
              </p>
              <button onClick={handleShare}
                className="w-full border-[3px] border-[#1c1b18] py-3 text-sm font-black uppercase tracking-widest bg-[#1c1b18] text-[#dcdad2] hover:bg-transparent hover:text-[#1c1b18] transition-colors">
                Share to Unlock Reward
              </button>
            </>
          )}

          {/* State 2: Shared → can claim */}
          {canClaim && (
            <>
              <p className="text-xl font-black uppercase tracking-tight mb-2">
                Your reward is ready.
              </p>
              <p className="text-sm leading-relaxed mb-6">
                The next edition arrives within the hour.
              </p>
              <div className="border-[3px] border-[#1c1b18] p-5 mb-4">
                {isConnected ? (
                  <button onClick={handleClaim} disabled={isPending}
                    className="w-full border-[2px] border-[#1c1b18] py-2.5 text-sm font-black uppercase tracking-widest bg-[#1c1b18] text-[#dcdad2] hover:bg-transparent hover:text-[#1c1b18] transition-colors">
                    {isPending ? "Processing..." : "Collect 69 Tokens"}
                  </button>
                ) : (
                  <ConnectButton.Custom>
                    {({ openConnectModal, mounted }) => (
                      <button onClick={openConnectModal} disabled={!mounted}
                        className="w-full border-[2px] border-[#1c1b18] py-2.5 text-sm font-black uppercase tracking-widest hover:bg-[#1c1b18] hover:text-[#dcdad2] transition-colors">
                        Connect Wallet to Collect
                      </button>
                    )}
                  </ConnectButton.Custom>
                )}
              </div>
            </>
          )}

          {/* State 3: Haven't read enough yet (shouldn't normally reach here but just in case) */}
          {!readEnough && (
            <>
              <p className="text-xl font-black uppercase tracking-tight mb-2">
                That&apos;s the latest edition.
              </p>
              <p className="text-sm leading-relaxed">
                The next edition arrives within the hour.<br/>Check back shortly.
              </p>
            </>
          )}

          <p className="text-[10px] uppercase tracking-widest font-sans font-bold mt-6">
            {readCount} articles read
          </p>
        </div>
      </main>
    );
  }

  // ─── ARTICLE VIEW ───
  const currentArticle = unreadArticles[currentIndex];

  return (
    <main className="fixed inset-0 bg-paper text-[#1c1b18] overflow-hidden font-serif selection:bg-[#1c1b18] selection:text-[#dcdad2] flex flex-col items-center justify-center">
      <div className="w-full h-full max-w-2xl px-4 py-6 flex flex-col relative z-10">

        {/* Masthead */}
        <header className="border-b-[5px] border-[#1c1b18] pb-2 mb-3 flex flex-col items-center shrink-0">
          <div className="w-full flex justify-between items-end border-b-2 border-[#1c1b18] pb-1 mb-1 px-1">
            <span className="text-[10px] uppercase font-sans tracking-widest font-bold">
              Read {readCount} of {READS_TO_CLAIM}
            </span>
            <span className="text-[10px] uppercase font-sans tracking-widest font-bold">
              {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-black uppercase tracking-tighter mt-1 text-center" style={{ fontFamily: 'Georgia, serif', transform: 'scaleY(1.1)' }}>
            Breaking News
          </h1>
        </header>

        {/* Article Card */}
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
              {/* Source + Time */}
              <div className="flex justify-between items-center border-b-[3px] border-[#1c1b18] pb-1 mb-3 shrink-0">
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
                        <span className="absolute left-0 font-black text-lg">·</span>
                        {cleanLine}
                      </p>
                    );
                  })}
                </div>
              </div>

              {/* Read Full button only */}
              <div className="mt-auto shrink-0 w-full pt-3 border-t-2 border-[#1c1b18]">
                <a href={currentArticle.url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-center w-full border-[3px] border-[#1c1b18] py-2.5 text-xs sm:text-sm font-black uppercase tracking-widest hover:bg-[#1c1b18] hover:text-[#dcdad2] transition-colors bg-transparent text-[#1c1b18]">
                  Read Full Article
                </a>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Page indicator */}
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
