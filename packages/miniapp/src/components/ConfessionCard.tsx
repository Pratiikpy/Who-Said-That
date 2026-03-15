"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { type DbConfession } from "../lib/supabase";
import { getTimeAgo, classNames } from "../lib/utils";

// ─── Inline SVG Icons ────────────────────────────────────────────────

function LockIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#A78BFA"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0110 0v4" />
    </svg>
  );
}

function TargetIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  );
}

function LightbulbIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9 18h6" />
      <path d="M10 22h4" />
      <path d="M12 2a7 7 0 00-4 12.7V17h8v-2.3A7 7 0 0012 2z" />
    </svg>
  );
}

function ReplyIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
    </svg>
  );
}

// ─── Component ───────────────────────────────────────────────────────

interface ConfessionCardProps {
  confession: DbConfession;
  index?: number;
  showActions?: boolean;
}

export function ConfessionCard({
  confession,
  index = 0,
  showActions = true,
}: ConfessionCardProps) {
  const isAnonymousLink = confession.is_anonymous_link;
  const timeAgo = getTimeAgo(confession.created_at);

  // Derive avatar letter from message or type
  const avatarLetter = isAnonymousLink ? "S" : "A";

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.4,
        delay: index * 0.06,
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
    >
      <Link href={`/app/c/${confession.id}`} className="block">
        <div
          className={classNames(
            "card-interactive p-4 space-y-3",
            "hover:border-accent/20"
          )}
          style={{ WebkitTapHighlightColor: "transparent" }}
        >
          {/* Header row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              {/* Avatar */}
              <div
                className={classNames(
                  "w-8 h-8 rounded-full flex items-center justify-center",
                  isAnonymousLink
                    ? "bg-surface-elevated"
                    : "bg-accent-muted"
                )}
              >
                {isAnonymousLink ? (
                  <span className="text-xs font-semibold text-dim">
                    {avatarLetter}
                  </span>
                ) : (
                  <LockIcon />
                )}
              </div>

              {/* Label */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-medium text-muted">
                  {isAnonymousLink ? "Stranger" : "Anonymous"}
                </span>
                {!isAnonymousLink && (
                  <span className="text-[10px] text-accent/70 font-medium">
                    FHE
                  </span>
                )}
              </div>
            </div>

            <span className="text-[11px] text-dim tabular-nums">{timeAgo}</span>
          </div>

          {/* Message preview */}
          <p className="text-[14px] text-foreground/90 leading-relaxed line-clamp-3 font-light italic">
            &ldquo;{confession.message}&rdquo;
          </p>

          {/* Action badges */}
          {showActions && (
            <div className="flex items-center gap-2 pt-0.5">
              {!isAnonymousLink && (
                <>
                  <span className="badge badge-accent">
                    <TargetIcon />
                    Guess
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-warm/10 text-warm">
                    <LightbulbIcon />
                    Hint
                  </span>
                </>
              )}
              <span className="badge badge-muted">
                <ReplyIcon />
                Reply
              </span>
            </div>
          )}
        </div>
      </Link>
    </motion.div>
  );
}

// ─── Empty State ─────────────────────────────────────────────────────

function EmptyInboxIcon() {
  return (
    <svg
      width="40"
      height="40"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#8B5CF6"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 12h-6l-2 3h-4l-2-3H2" />
      <path d="M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z" />
    </svg>
  );
}

export function EmptyInbox({ onCopyLink }: { onCopyLink: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="text-center py-20 px-6"
    >
      <div className="w-20 h-20 mx-auto rounded-3xl bg-accent-muted border border-border-subtle flex items-center justify-center mb-6">
        <EmptyInboxIcon />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">
        No confessions yet
      </h3>
      <p className="text-sm text-dim max-w-[260px] mx-auto mb-6 leading-relaxed">
        Share your link on Farcaster, Twitter, or anywhere to start receiving
        anonymous confessions.
      </p>
      <button onClick={onCopyLink} className="btn btn-primary max-w-[240px] mx-auto">
        Copy Your Link
      </button>
    </motion.div>
  );
}
