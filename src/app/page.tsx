"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useWriteContract } from 'wagmi';
import { signalTokenAbi } from '@/lib/abi';
import sdk from '@farcaster/miniapp-sdk';
import mockFeed from "@/data/mock-feed.json";

// Initialize Farcaster Mini App SDK (tell Warpcast we're ready)
if (typeof window !== 'undefined') {
  sdk.actions.ready();
}

export default function Home() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [points, setPoints] = useState(0);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [shared, setShared] = useState<Record<string, boolean>>({});

  const { isConnected } = useAccount();
  const { writeContract, isPending, isSuccess } = useWriteContract();

  // SignalToken deployed on Base mainnet
  const CONTRACT_ADDRESS = "0x1d705c7cb1bbe119f83f48520234f074e9157907";

  // Filter out already-read articles
  const unreadArticles = useMemo(() => {
    return mockFeed.filter(a => !readIds.has(a.id));
  }, [readIds]);

  // Load persisted state
  useEffect(() => {
    const savedPoints = localStorage.getItem("signal_points");
    if (savedPoints) setPoints(parseInt(savedPoints, 10));

    const savedReadIds = localStorage.getItem("signal_read_ids");
    if (savedReadIds) setReadIds(new Set(JSON.parse(savedReadIds)));
  }, []);

  // Mark article as read after 3 seconds
  useEffect(() => {
    if (unreadArticles.length === 0) return;
    const currentArticle = unreadArticles[currentIndex];
    if (!currentArticle) return;

    const timer = setTimeout(() => {
      if (!readIds.has(currentArticle.id)) {
        const newReadIds = new Set(readIds);
        newReadIds.add(currentArticle.id);
        setReadIds(newReadIds);
        localStorage.setItem("signal_read_ids", JSON.stringify([...newReadIds]));

        const newPoints = points + 5;
        setPoints(newPoints);
        localStorage.setItem("signal_points", newPoints.toString());
      }
    }, 3000);
    return () => clearTimeout(timer);
  }, [currentIndex, points, readIds, unreadArticles]);

  // Handle successful claim
  useEffect(() => {
    if (isSuccess) {
      const newPoints = points - 69;
      setPoints(newPoints);
      localStorage.setItem("signal_points", newPoints.toString());
      alert("Transaction successful! You claimed 69 $SIGNAL.");
    }
  }, [isSuccess]);

  const handleClaim = () => {
    if (points >= 69) {
      writeContract({
        address: CONTRACT_ADDRESS,
        abi: signalTokenAbi,
        functionName: 'claim',
      });
    }
  };

  const handleDragEnd = (e: any, { offset }: any) => {
    if (unreadArticles.length === 0) return;
    const swipeThreshold = 50;
    if (offset.x < -swipeThreshold && currentIndex < unreadArticles.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else if (offset.x > swipeThreshold && currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleShare = async (article: typeof mockFeed[0]) => {
    const shareData = {
      title: article.title,
      text: "Found this signal on Breaking News: " + article.url,
      url: article.url
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(`${shareData.title}\n${shareData.url}`);
        alert("Link copied to clipboard!");
      }

      if (!shared[article.id]) {
        setShared(prev => ({ ...prev, [article.id]: true }));
        const newPoints = points + 15;
        setPoints(newPoints);
        localStorage.setItem("signal_points", newPoints.toString());
      }
    } catch (err) {
      console.error("Error sharing:", err);
    }
  };

  // ─── "All Caught Up" screen ───
  if (unreadArticles.length === 0) {
    return (
      <main className="fixed inset-0 bg-paper text-[#1c1b18] overflow-hidden font-serif flex flex-col items-center justify-center">
        <div className="w-full h-full max-w-2xl px-4 py-6 flex flex-col relative z-10">

          <header className="border-b-[5px] border-[#1c1b18] pb-2 mb-3 flex flex-col items-center shrink-0">
            <div className="w-full flex justify-between items-end border-b-2 border-[#1c1b18] pb-1 mb-1 px-1">
              <span className="text-[10px] uppercase font-sans tracking-widest font-bold">Pts: {points}</span>
              <span className="text-[10px] uppercase font-sans tracking-widest font-bold hidden sm:inline-block">{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
              <ConnectButton.Custom>
                {({ account, chain, openConnectModal, openAccountModal, mounted }) => {
                  const ready = mounted;
                  const connected = ready && account && chain;
                  return (
                    <div {...(!ready && { 'aria-hidden': true, style: { opacity: 0, pointerEvents: 'none', userSelect: 'none' } })}>
                      {!connected ? (
                        <button onClick={openConnectModal} type="button" className="text-[10px] uppercase font-sans tracking-widest font-bold hover:bg-[#1c1b18] hover:text-[#dcdad2] px-1 transition-colors">
                          [ Connect Wallet ]
                        </button>
                      ) : (
                        <button onClick={openAccountModal} type="button" className="text-[10px] uppercase font-sans tracking-widest font-bold hover:bg-[#1c1b18] hover:text-[#dcdad2] px-1 transition-colors">
                          {account.displayName}
                        </button>
                      )}
                    </div>
                  );
                }}
              </ConnectButton.Custom>
            </div>
            <h1 className="text-4xl sm:text-5xl font-black uppercase tracking-tighter mt-1 text-center" style={{ fontFamily: 'Georgia, serif', transform: 'scaleY(1.1)' }}>
              Breaking News
            </h1>
          </header>

          <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
            <div className="text-6xl mb-6">📰</div>
            <h2 className="text-3xl font-black uppercase tracking-tight mb-3">You&apos;re all caught up!</h2>
            <p className="text-lg leading-relaxed mb-8 max-w-md">
              No new signals right now.<br />
              Fresh news drops every hour.
            </p>
            <div className="border-[3px] border-[#1c1b18] px-6 py-3">
              <span className="font-black uppercase tracking-widest text-sm">
                {mockFeed.length} articles read · {points} pts earned
              </span>
            </div>

            {points >= 69 && isConnected && (
              <button
                onClick={handleClaim}
                disabled={isPending}
                className="mt-6 w-full max-w-xs border-[3px] border-[#1c1b18] py-3 text-lg font-black uppercase tracking-widest bg-[#1c1b18] text-[#dcdad2] hover:bg-transparent hover:text-[#1c1b18] transition-colors"
              >
                {isPending ? "Claiming..." : "CLAIM 69 $SIGNAL"}
              </button>
            )}
          </div>

        </div>
      </main>
    );
  }

  // ─── Normal article view ───
  const currentArticle = unreadArticles[currentIndex];

  return (
    <main className="fixed inset-0 bg-paper text-[#1c1b18] overflow-hidden font-serif selection:bg-[#1c1b18] selection:text-[#dcdad2] flex flex-col items-center justify-center">

      <div className="w-full h-full max-w-2xl px-4 py-6 flex flex-col relative z-10">

        {/* Newspaper Masthead */}
        <header className="border-b-[5px] border-[#1c1b18] pb-2 mb-3 flex flex-col items-center shrink-0">
          <div className="w-full flex justify-between items-end border-b-2 border-[#1c1b18] pb-1 mb-1 px-1">
            <span className="text-[10px] uppercase font-sans tracking-widest font-bold">Pts: {points}</span>
            <span className="text-[10px] uppercase font-sans tracking-widest font-bold hidden sm:inline-block">{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>

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

        {/* Swipeable Content Area */}
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

              {/* Meta Info Bar */}
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

              {/* Divider */}
              <div className="w-full border-t-[1.5px] border-[#1c1b18] mb-3 shrink-0"></div>

              {/* Content (3-line summary) */}
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

              {/* Action Buttons Row */}
              <div className="mt-auto shrink-0 w-full grid grid-cols-2 gap-3 pt-3 border-t-2 border-[#1c1b18]">
                <a
                  href={currentArticle.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center w-full border-[3px] border-[#1c1b18] py-2.5 text-xs sm:text-sm font-black uppercase tracking-widest hover:bg-[#1c1b18] hover:text-[#dcdad2] transition-colors bg-transparent text-[#1c1b18]"
                >
                  Read Full
                </a>
                <button
                  onClick={() => handleShare(currentArticle)}
                  className={`flex items-center justify-center w-full border-[3px] border-[#1c1b18] py-2.5 text-xs sm:text-sm font-black uppercase tracking-widest transition-all ${
                    shared[currentArticle.id]
                      ? "bg-[#1c1b18] text-[#dcdad2]"
                      : "hover:bg-[#1c1b18] hover:text-[#dcdad2] bg-transparent text-[#1c1b18]"
                  }`}
                >
                  {shared[currentArticle.id] ? "Shared (+15)" : "Share"}
                </button>
              </div>

              {/* Claim Action (Conditional) */}
              {points >= 69 && isConnected && (
                <div className="mt-3 shrink-0 w-full flex">
                  <button
                    onClick={handleClaim}
                    disabled={isPending}
                    className="w-full border-[3px] border-[#1c1b18] py-3 text-lg font-black uppercase tracking-widest bg-[#1c1b18] text-[#dcdad2] hover:bg-transparent hover:text-[#1c1b18] transition-colors"
                  >
                    {isPending ? "Claiming..." : "CLAIM 69 $SIGNAL"}
                  </button>
                </div>
              )}

            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer Progress */}
        <div className="mt-4 flex justify-center items-center gap-1 shrink-0">
          {unreadArticles.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 border border-[#1c1b18] transition-all duration-300 ${
                i === currentIndex ? "w-5 bg-[#1c1b18]" : "w-1.5 bg-transparent"
              }`}
            />
          ))}
        </div>

      </div>
    </main>
  );
}
