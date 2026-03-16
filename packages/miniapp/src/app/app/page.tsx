"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useMiniKit } from "@coinbase/onchainkit/minikit";
import { AnimatePresence } from "framer-motion";
import { supabase, setCurrentFid, type DbConfession } from "../../lib/supabase";
import { copyToClipboard, getTimeAgo } from "../../lib/utils";
import { useToast } from "../../components/Toast";
import { useHaptics } from "../../hooks/useHaptics";
import Link from "next/link";
import { AnimatedNumber } from "../../components/AnimatedNumber";
import { SmartEmptyState } from "../../components/SmartEmptyState";
import { PullToRefresh } from "../../components/PullToRefresh";
import { AmbientCard } from "../../components/AmbientCard";
import { ConfessionBorder } from "../../components/ConfessionBorder";
import { BreathingAnimation } from "../../components/BreathingAnimation";
import { useOptimisticList, type OptimisticItem } from "../../hooks/useOptimisticList";

// ─── Inline SVG Icons (no emojis) ──────────────────────────────────

function LinkIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8.5 11.5a4 4 0 005.66 0l2.12-2.12a4 4 0 00-5.66-5.66L9.5 4.84" />
      <path d="M11.5 8.5a4 4 0 00-5.66 0L3.72 10.62a4 4 0 005.66 5.66l1.12-1.12" />
    </svg>
  );
}

function TargetIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
      <circle cx="6" cy="6" r="5" />
      <circle cx="6" cy="6" r="2.5" />
      <circle cx="6" cy="6" r="0.5" fill="currentColor" />
    </svg>
  );
}

function BulbIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
      <path d="M4.5 10h3M6 1a3.5 3.5 0 012 6.33V9h-4V7.33A3.5 3.5 0 016 1z" />
    </svg>
  );
}

function ChatIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 6a5 5 0 005 5l2-1.5L11 11V6A5 5 0 001 6z" />
    </svg>
  );
}

// ─── Skeleton Loading ───────────────────────────────────────────────

function SkeletonStatCard() {
  return (
    <div className="card p-4 space-y-2">
      <div className="h-8 w-12 skeleton rounded" />
      <div className="h-3 w-16 skeleton rounded" />
    </div>
  );
}

function SkeletonConfessionCard() {
  return (
    <div className="card p-4 space-y-3">
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-full skeleton" />
        <div className="space-y-1.5 flex-1">
          <div className="h-3.5 w-24 skeleton rounded" />
          <div className="h-2.5 w-14 skeleton rounded" />
        </div>
      </div>
      <div className="space-y-2">
        <div className="h-3 w-full skeleton rounded" />
        <div className="h-3 w-4/5 skeleton rounded" />
      </div>
      <div className="flex gap-2">
        <div className="h-6 w-16 rounded-full skeleton" />
        <div className="h-6 w-14 rounded-full skeleton" />
      </div>
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────

export default function InboxPage() {
  const { context } = useMiniKit();
  const { toast } = useToast();
  const { tap } = useHaptics();
  const [serverConfessions, setServerConfessions] = useState<DbConfession[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasEverLoaded, setHasEverLoaded] = useState(false);

  const userFid = context?.user?.fid;

  // ─── Set Current FID for RLS ──────────────────────────────────
  useEffect(() => {
    if (userFid) {
      setCurrentFid(userFid);
    }
  }, [userFid]);

  // ─── Optimistic List ─────────────────────────────────────────
  const {
    items: confessions,
    addOptimistic,
    setConfirmed,
  } = useOptimisticList<DbConfession>(serverConfessions);

  // Sync server confessions to optimistic list
  useEffect(() => {
    setConfirmed(serverConfessions);
  }, [serverConfessions, setConfirmed]);

  // ─── Fetch Inbox ────────────────────────────────────────────────

  const fetchInbox = useCallback(async () => {
    if (!userFid) return;
    setLoading(true);
    try {
      const { data } = await supabase
        .from("confessions")
        .select("*")
        .eq("recipient_fid", userFid)
        .eq("is_public", false)
        .order("created_at", { ascending: false });
      if (data) setServerConfessions(data);
    } catch {
      // Supabase error — show empty state
    }
    setLoading(false);
    setHasEverLoaded(true);
  }, [userFid]);

  useEffect(() => {
    fetchInbox();
  }, [fetchInbox]);

  // ─── Realtime Subscription ──────────────────────────────────────

  useEffect(() => {
    if (!userFid) return;
    const channel = supabase
      .channel(`inbox:${userFid}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "confessions",
          filter: `recipient_fid=eq.${userFid}`,
        },
        (payload) => {
          const newConfession = payload.new as DbConfession;
          addOptimistic(newConfession);
          toast("New confession received!", "info");
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userFid, toast, addOptimistic]);

  // ─── Computed Stats ─────────────────────────────────────────────

  const stats = useMemo(() => {
    const received = confessions.length;
    // Count confessions that haven't been viewed (no guesses attempted,
    // no thread replies from recipient = likely unread)
    const unread = confessions.filter(
      (c) => !c.is_anonymous_link && c.moderation_status === "approved"
    ).length;
    const guessed = confessions.filter(
      (c) => c.onchain_id !== null
    ).length;
    return { received, unread, guessed };
  }, [confessions]);

  // ─── Share Link ─────────────────────────────────────────────────

  const shareLink =
    typeof window !== "undefined"
      ? `${window.location.origin}/${context?.user?.username || userFid}`
      : "";

  const displayLink = shareLink
    .replace("https://", "")
    .replace("http://", "");

  const handleCopyLink = () => {
    copyToClipboard(shareLink);
    tap();
    toast("Link copied!", "success");
  };

  return (
    <PullToRefresh onRefresh={fetchInbox}>
      <div className="px-5 py-4 space-y-6">
        {/* ── Share Link Card ────────────────────────────────────── */}
        <button
          onClick={handleCopyLink}
          className="w-full card p-4 text-left active:scale-[0.98] transition-transform"
          style={{ WebkitTapHighlightColor: "transparent" }}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p className="section-label">Your Link</p>
              <p className="text-accent font-mono text-sm mt-1.5 truncate">
                {displayLink}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-accent-muted flex items-center justify-center flex-shrink-0">
              <LinkIcon className="text-accent" />
            </div>
          </div>
        </button>

        {/* ── Stats Row ──────────────────────────────────────────── */}
        {loading ? (
          <div className="grid grid-cols-3 gap-3">
            <SkeletonStatCard />
            <SkeletonStatCard />
            <SkeletonStatCard />
          </div>
        ) : (
          <BreathingAnimation>
            <div className="grid grid-cols-3 gap-3">
              <AmbientCard delay={0}>
                <div className="p-4">
                  <p className="stat-value text-3xl text-foreground">
                    <AnimatedNumber value={stats.received} />
                  </p>
                  <p className="stat-label mt-1.5">Received</p>
                </div>
              </AmbientCard>
              <AmbientCard delay={0.05}>
                <div className="p-4">
                  <p className="stat-value text-3xl text-accent">
                    <AnimatedNumber value={stats.unread} />
                  </p>
                  <p className="stat-label mt-1.5">Unread</p>
                </div>
              </AmbientCard>
              <AmbientCard delay={0.1}>
                <div className="p-4">
                  <p className="stat-value text-3xl text-neon">
                    <AnimatedNumber value={stats.guessed} />
                  </p>
                  <p className="stat-label mt-1.5">Guessed</p>
                </div>
              </AmbientCard>
            </div>
          </BreathingAnimation>
        )}

        {/* ── Section Header ─────────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <h2 className="section-title">Confessions</h2>
          {!loading && confessions.length > 0 && (
            <span className="badge badge-neon">
              <span className="w-1.5 h-1.5 rounded-full bg-neon animate-pulse" />
              Live
            </span>
          )}
        </div>

        {/* ── Loading Skeletons ──────────────────────────────────── */}
        {loading && (
          <div className="space-y-3">
            <SkeletonConfessionCard />
            <SkeletonConfessionCard />
            <SkeletonConfessionCard />
          </div>
        )}

        {/* ── Empty State ────────────────────────────────────────── */}
        {!loading && confessions.length === 0 && (
          <SmartEmptyState
            type={hasEverLoaded ? "no-confessions" : "first-visit"}
            onAction={handleCopyLink}
          />
        )}

        {/* ── Confession List ────────────────────────────────────── */}
        <AnimatePresence>
          {!loading && confessions.length > 0 && (
            <div className="space-y-3">
              {confessions.map((c: OptimisticItem<DbConfession>) => (
                <div
                  key={c.id}
                  style={c.__pending ? { opacity: 0.6 } : undefined}
                >
                  <ConfessionBorder type="default">
                    <Link href={`/app/c/${c.id}`}>
                      <div className="card-interactive p-4 space-y-3">
                        {/* Header Row */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <div
                              className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold ${
                                c.is_anonymous_link
                                  ? "bg-surface-elevated text-dim"
                                  : "bg-accent-muted text-accent"
                              }`}
                            >
                              {c.is_anonymous_link ? "?" : (
                                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                                  <rect x="3.5" y="2" width="9" height="7" rx="2" />
                                  <path d="M5 9v1.5a3 3 0 006 0V9" />
                                </svg>
                              )}
                            </div>
                            <span className="text-sm font-medium text-foreground">
                              {c.is_anonymous_link ? "Stranger" : "Anonymous"}
                            </span>
                          </div>
                          <span className="text-xs text-dim tabular-nums">
                            {getTimeAgo(c.created_at)}
                          </span>
                        </div>

                        {/* Message Preview */}
                        <p className="text-[15px] text-muted leading-relaxed line-clamp-3 confession-text">
                          &ldquo;{c.message}&rdquo;
                        </p>

                        {/* Action Badges */}
                        <div className="flex items-center gap-2">
                          {!c.is_anonymous_link && (
                            <>
                              <span className="badge badge-accent">
                                <TargetIcon />
                                Guess
                              </span>
                              <span className="badge badge-muted">
                                <BulbIcon />
                                Hint
                              </span>
                            </>
                          )}
                          <span className="badge badge-muted">
                            <ChatIcon />
                            Reply
                          </span>
                        </div>
                      </div>
                    </Link>
                  </ConfessionBorder>
                </div>
              ))}
            </div>
          )}
        </AnimatePresence>
      </div>
    </PullToRefresh>
  );
}
