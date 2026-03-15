"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useMiniKit } from "@coinbase/onchainkit/minikit";
import { supabase, type DbConfession } from "../../../lib/supabase";
import { getTimeAgo } from "../../../lib/utils";
import { REACTION_TYPES } from "../../../lib/constants";
import { useHaptics } from "../../../hooks/useHaptics";
import { useFloatingReaction } from "../../../components/FloatingReaction";

// Emoji map for floating reactions
const REACTION_EMOJI: Record<string, string> = {
  fire: "\uD83D\uDD25",
  skull: "\uD83D\uDC80",
  heart_eyes: "\uD83D\uDE0D",
  shock: "\uD83D\uDE31",
  cap: "\uD83E\uDDE2",
};

// Text-based labels for reactions (no emojis)
const REACTION_LABELS: Record<string, { label: string; icon: React.ReactNode }> = {
  fire: {
    label: "Fire",
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8.5 14.5A2.5 2.5 0 0011 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 11-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 002.5 2.5z" />
      </svg>
    ),
  },
  skull: {
    label: "Dead",
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="8" y1="15" x2="16" y2="15" />
        <line x1="9" y1="9" x2="9.01" y2="9" />
        <line x1="15" y1="9" x2="15.01" y2="9" />
      </svg>
    ),
  },
  heart_eyes: {
    label: "Love",
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
      </svg>
    ),
  },
  shock: {
    label: "Shock",
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
      </svg>
    ),
  },
  cap: {
    label: "Cap",
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    ),
  },
};

export default function PublicFeedPage() {
  const { context } = useMiniKit();
  const [posts, setPosts] = useState<DbConfession[]>([]);
  const [loading, setLoading] = useState(true);

  const userFid = context?.user?.fid ?? 0;

  const fetchFeed = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("confessions")
      .select("*")
      .eq("is_public", true)
      .order("created_at", { ascending: false })
      .limit(50);

    if (data) setPosts(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchFeed();
  }, [fetchFeed]);

  // Realtime subscription for new posts
  useEffect(() => {
    const channel = supabase
      .channel("public_feed")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "confessions",
          filter: "is_public=eq.true",
        },
        (payload) => {
          setPosts((prev) => [payload.new as DbConfession, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (loading) {
    return (
      <div className="px-5 py-6 space-y-4">
        <h2 className="text-2xl font-bold font-display text-foreground">
          Public Feed
        </h2>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="card p-5 space-y-3"
            >
              <div className="skeleton h-3 w-32 rounded" />
              <div className="skeleton h-4 w-full rounded" />
              <div className="skeleton h-4 w-3/4 rounded" />
              <div className="flex gap-2 pt-1">
                {[1, 2, 3].map((j) => (
                  <div key={j} className="skeleton h-9 w-16 rounded-full" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="px-5 py-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold font-display text-foreground">
          Public Feed
        </h2>
        <Link href="/app/compose">
          <div
            className="flex items-center gap-1.5 px-4 min-h-[40px] rounded-xl text-sm font-semibold transition-colors bg-accent text-white"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Post
          </div>
        </Link>
      </div>

      {/* Live indicator */}
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full animate-pulse bg-neon" />
        <span className="text-xs font-medium text-neon">
          LIVE
        </span>
        <span className="text-xs text-dim">
          {posts.length} confession{posts.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Posts */}
      {posts.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-20 space-y-4"
        >
          <div className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center card">
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              className="stroke-dim"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
            </svg>
          </div>
          <div className="space-y-1.5">
            <p className="text-base font-semibold text-muted">
              No public confessions yet
            </p>
            <p className="text-sm text-dim">
              Be the first to post anonymously.
            </p>
          </div>
          <Link href="/app/compose">
            <div className="btn btn-primary mx-auto inline-flex mt-2">
              Write a Confession
            </div>
          </Link>
        </motion.div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence initial={false}>
            {posts.map((post, index) => (
              <motion.div
                key={post.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index < 5 ? index * 0.05 : 0 }}
                layout
              >
                <PublicPostCard post={post} reactorFid={userFid} />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

function PublicPostCard({ post, reactorFid: _reactorFid }: { post: DbConfession; reactorFid: number }) {
  const { tap } = useHaptics();
  const [reactions, setReactions] = useState<Record<string, number>>({});
  const [activeReaction, setActiveReaction] = useState<string | null>(null);
  const timeAgo = getTimeAgo(post.created_at);
  const { emit, ParticleLayer } = useFloatingReaction();

  const handleReaction = async (type: string, event: React.MouseEvent) => {
    tap();

    // Emit floating reaction particle
    const emoji = REACTION_EMOJI[type];
    if (emoji) {
      emit(emoji, event);
    }

    // Optimistic UI update
    if (activeReaction === type) {
      setActiveReaction(null);
      setReactions((prev) => ({
        ...prev,
        [type]: Math.max((prev[type] || 0) - 1, 0),
      }));
    } else {
      if (activeReaction) {
        setReactions((prev) => ({
          ...prev,
          [activeReaction]: Math.max((prev[activeReaction] || 0) - 1, 0),
        }));
      }
      setActiveReaction(type);
      setReactions((prev) => ({
        ...prev,
        [type]: (prev[type] || 0) + 1,
      }));
    }

    // Persist to API
    try {
      const { authFetch } = await import("../../../lib/api");
      await authFetch("/api/reactions", {
        method: "POST",
        body: JSON.stringify({
          confessionId: post.id,
          reactionType: type,
        }),
      });
    } catch {
      // Revert optimistic update on failure
    }
  };

  // Unmask progress (placeholder data)
  const unmaskCurrent = 0;
  const unmaskGoal = 0.05;
  const unmaskPercent =
    unmaskGoal > 0 ? Math.min((unmaskCurrent / unmaskGoal) * 100, 100) : 0;

  return (
    <div className="card p-5 space-y-4">
      {/* Floating reaction particles */}
      <ParticleLayer />

      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full flex items-center justify-center bg-accent-muted">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            className="stroke-accent"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0110 0v4" />
          </svg>
        </div>
        <span className="text-xs font-medium text-muted">
          Anonymous
        </span>
        <span className="text-dim">&middot;</span>
        <span className="text-xs text-dim">
          {timeAgo}
        </span>
      </div>

      {/* Message */}
      <p className="text-base leading-relaxed text-foreground">
        &ldquo;{post.message}&rdquo;
      </p>

      {/* Reaction bar */}
      <div className="flex items-center gap-2 flex-wrap">
        {REACTION_TYPES.map((r) => {
          const isActive = activeReaction === r.type;
          const count = reactions[r.type] || 0;
          const meta = REACTION_LABELS[r.type];

          return (
            <button
              key={r.type}
              onClick={(e) => handleReaction(r.type, e)}
              className={`flex items-center gap-1.5 px-3 rounded-full transition-all duration-150 ${
                isActive
                  ? "bg-accent-muted border border-accent/30 text-accent-soft"
                  : "bg-glass border border-transparent text-muted"
              }`}
              style={{
                minHeight: "36px",
                minWidth: "48px",
              }}
            >
              {meta?.icon}
              <span className="text-xs font-medium">
                {meta?.label || r.label}
              </span>
              {count > 0 && (
                <span
                  className={`text-xs font-mono ${
                    isActive ? "text-accent-soft" : "text-dim"
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Unmask progress */}
      <div className="space-y-2.5 pt-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              className="stroke-dim"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0110 0v4" />
            </svg>
            <span className="text-xs font-medium text-dim">
              Unmask Progress
            </span>
          </div>
          <span className="text-xs font-mono text-dim">
            {unmaskCurrent} / {unmaskGoal} ETH
          </span>
        </div>

        {/* Progress bar */}
        <div className="w-full h-1.5 rounded-full overflow-hidden bg-border-subtle">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: `${unmaskPercent}%`,
              background:
                unmaskPercent > 0
                  ? "linear-gradient(90deg, #8B5CF6, #22C55E)"
                  : "var(--color-border)",
            }}
          />
        </div>

        {/* Contribute button */}
        <button
          onClick={() => tap()}
          className="w-full flex items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-colors bg-accent/[0.08] text-accent border border-accent/15"
          style={{ minHeight: "44px" }}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="12" y1="1" x2="12" y2="23" />
            <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
          </svg>
          Contribute to Unmask
        </button>
      </div>
    </div>
  );
}
