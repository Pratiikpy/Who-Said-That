"use client";

import { useEffect, useState } from "react";
import { useMiniKit } from "@coinbase/onchainkit/minikit";
import { useAccount } from "wagmi";
import { AnimatedNumber } from "../../../components/AnimatedNumber";
import { supabase } from "../../../lib/supabase";
import { copyToClipboard } from "../../../lib/utils";
import { useToast } from "../../../components/Toast";
import { useHaptics } from "../../../hooks/useHaptics";
import { motion } from "framer-motion";

interface ProfileStats {
  received: number;
  admirers: number;
  guessRate: number;
}

export default function ProfilePage() {
  const { context } = useMiniKit();
  const { address } = useAccount();
  const { toast } = useToast();
  const { tap } = useHaptics();
  const [stats, setStats] = useState<ProfileStats>({
    received: 0,
    admirers: 0,
    guessRate: 0,
  });

  const user = context?.user;

  useEffect(() => {
    if (!user?.fid) return;
    const fetchStats = async () => {
      try {
        // Count confessions received
        const { count: receivedCount } = await supabase
          .from("confessions")
          .select("*", { count: "exact", head: true })
          .eq("recipient_fid", user.fid);

        // Count unique admirers (unique senders)
        const { data: admirerData } = await supabase
          .from("confessions")
          .select("sender_fid")
          .eq("recipient_fid", user.fid)
          .not("sender_fid", "is", null);

        const uniqueAdmirers = new Set(
          (admirerData || []).map((d) => d.sender_fid)
        ).size;

        // Calculate guess rate from guesses
        const { data: guessData } = await supabase
          .from("guesses")
          .select("is_correct, confession_id")
          .in(
            "confession_id",
            (admirerData || []).map((d) => d.sender_fid).length > 0
              ? (
                  await supabase
                    .from("confessions")
                    .select("id")
                    .eq("recipient_fid", user.fid)
                ).data?.map((c) => c.id) || []
              : []
          );

        const totalGuesses = (guessData || []).length;
        const correctGuesses = (guessData || []).filter(
          (g) => g.is_correct
        ).length;
        const guessRate =
          totalGuesses > 0 ? Math.round((correctGuesses / totalGuesses) * 100) : 0;

        setStats({
          received: receivedCount || 0,
          admirers: uniqueAdmirers,
          guessRate,
        });
      } catch {
        // Silently fail — show zeros
      }
    };
    fetchStats();
  }, [user?.fid]);

  const shareLink =
    typeof window !== "undefined"
      ? `${window.location.origin}/${user?.username || user?.fid || ""}`
      : "";

  const displayLink = shareLink
    .replace("https://", "")
    .replace("http://", "");

  const handleCopyLink = () => {
    copyToClipboard(shareLink);
    tap();
    toast("Link copied!", "success");
  };

  const handleShareCard = () => {
    tap();
    // Share via native share sheet if available
    if (navigator.share) {
      navigator.share({
        title: "Who Said That",
        text: `Send me anonymous confessions on Who Said That`,
        url: shareLink,
      }).catch(() => {
        // User cancelled or share failed, copy link as fallback
        copyToClipboard(shareLink);
        toast("Link copied!", "success");
      });
    } else {
      copyToClipboard(shareLink);
      toast("Link copied!", "success");
    }
  };

  const statCards: Array<{
    value: string | number;
    label: string;
    colorClass: string;
    delay: number;
  }> = [
    {
      value: stats.received,
      label: "Received",
      colorClass: "text-foreground",
      delay: 0.1,
    },
    {
      value: stats.admirers,
      label: "Admirers",
      colorClass: "text-accent",
      delay: 0.15,
    },
    {
      value: `${stats.guessRate}%`,
      label: "Guess Rate",
      colorClass: "text-neon",
      delay: 0.2,
    },
  ];

  return (
    <div className="px-5 py-6 space-y-6">
      {/* Avatar + Name with gradient ring */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col items-center text-center space-y-3 pt-2"
      >
        <div className="relative">
          {/* Gradient ring: violet to green */}
          <div
            className="w-[100px] h-[100px] rounded-full p-[3px]"
            style={{
              background: "linear-gradient(135deg, #8B5CF6, #22C55E)",
            }}
          >
            {user?.pfpUrl ? (
              <img
                src={user.pfpUrl}
                alt={user.displayName || ""}
                className="w-full h-full rounded-full object-cover border-3 border-void"
              />
            ) : (
              <div className="w-full h-full rounded-full flex items-center justify-center bg-surface border-3 border-void">
                <svg
                  width="32"
                  height="32"
                  viewBox="0 0 24 24"
                  fill="none"
                  className="stroke-dim"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </div>
            )}
          </div>

          {/* Online indicator */}
          <div
            className="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-neon border-3 border-void"
            style={{
              boxShadow: "0 0 8px rgba(34, 197, 94, 0.4)",
            }}
          />
        </div>

        {/* Name + username */}
        <div className="space-y-0.5">
          <h2 className="text-2xl font-bold font-display text-foreground">
            {user?.displayName || "Anonymous"}
          </h2>
          <p className="text-sm text-dim">
            @{user?.username || user?.fid}
          </p>
        </div>
      </motion.div>

      {/* Stats grid: 3 big-number cards */}
      <div className="grid grid-cols-3 gap-3">
        {statCards.map((stat) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: stat.delay, duration: 0.35 }}
            className="card p-4 text-center"
          >
            <p
              className={`stat-value text-3xl ${stat.colorClass}`}
            >
              <AnimatedNumber value={stat.value} />
            </p>
            <p className="stat-label mt-2">
              {stat.label}
            </p>
          </motion.div>
        ))}
      </div>

      {/* Share link card */}
      <motion.button
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        onClick={handleCopyLink}
        className="w-full card-interactive p-4 text-left active:scale-[0.98] transition-transform"
      >
        <p className="section-label">
          Your Anonymous Link
        </p>
        <p className="font-mono text-sm mt-2 truncate text-accent">
          {displayLink}
        </p>
        <div className="flex items-center gap-1.5 mt-2.5">
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            className="stroke-neon"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
          </svg>
          <span className="text-xs font-medium text-neon">
            Tap to copy
          </span>
        </div>
      </motion.button>

      {/* Share card button */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <button onClick={handleShareCard} className="btn btn-primary w-full">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="18" cy="5" r="3" />
            <circle cx="6" cy="12" r="3" />
            <circle cx="18" cy="19" r="3" />
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
          </svg>
          Share Card
        </button>
      </motion.div>

      {/* Settings section */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="space-y-2.5"
      >
        <h3 className="section-label px-1">
          Settings
        </h3>

        <div className="card overflow-hidden">
          {/* Notifications */}
          <div className="flex items-center justify-between px-4 min-h-[52px]">
            <div className="flex items-center gap-3">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                className="stroke-muted"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 01-3.46 0" />
              </svg>
              <span className="text-[15px] text-foreground">Notifications</span>
            </div>
            <span className="text-sm font-semibold text-neon">
              ON
            </span>
          </div>

          {/* Divider */}
          <div className="mx-4 border-t border-border-subtle" />

          {/* Who can confess */}
          <div className="flex items-center justify-between px-4 min-h-[52px]">
            <div className="flex items-center gap-3">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                className="stroke-muted"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 00-3-3.87" />
                <path d="M16 3.13a4 4 0 010 7.75" />
              </svg>
              <span className="text-[15px] text-foreground">
                Who can confess
              </span>
            </div>
            <span className="text-sm text-dim">
              Everyone
            </span>
          </div>

          {/* Divider */}
          <div className="mx-4 border-t border-border-subtle" />

          {/* Wallet */}
          <div className="flex items-center justify-between px-4 min-h-[52px]">
            <div className="flex items-center gap-3">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                className="stroke-muted"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="2" y="4" width="20" height="16" rx="2" />
                <path d="M22 10H2" />
                <circle cx="17" cy="15" r="1" />
              </svg>
              <span className="text-[15px] text-foreground">Wallet</span>
            </div>
            <span className="text-sm font-mono text-dim">
              {address
                ? `${address.slice(0, 6)}...${address.slice(-4)}`
                : "\u2014"}
            </span>
          </div>

          {/* Divider */}
          <div className="mx-4 border-t border-border-subtle" />

          {/* FID */}
          <div className="flex items-center justify-between px-4 min-h-[52px]">
            <div className="flex items-center gap-3">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                className="stroke-muted"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              <span className="text-[15px] text-foreground">Farcaster ID</span>
            </div>
            <span className="text-sm font-mono text-dim">
              {user?.fid || "\u2014"}
            </span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
