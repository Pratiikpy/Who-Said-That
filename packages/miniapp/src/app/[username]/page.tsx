"use client";

import { useState, useRef, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { MAX_CONFESSION_LENGTH } from "../../lib/constants";

/* ── Prompt Chips ────────────────────────────────────────────────────── */

const PROMPT_CHIPS = [
  "Something I\u2019ve always wanted to tell you",
  "A compliment you need to hear",
  "An honest opinion about you",
  "A secret I\u2019ve been keeping",
  "What I really think of your work",
  "Something nobody else would say",
];

/* ── Inline SVG Icons (Lucide-style, 24x24) ──────────────────────────── */

function UserIcon({ className = "w-8 h-8" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="8" r="4" />
      <path d="M20 21a8 8 0 1 0-16 0" />
    </svg>
  );
}

function ShieldLockIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <rect x="9" y="10" width="6" height="5" rx="1" />
      <path d="M10 10V8a2 2 0 1 1 4 0v2" />
    </svg>
  );
}

function ArrowRightIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  );
}

function XCircleIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="m15 9-6 6" />
      <path d="m9 9 6 6" />
    </svg>
  );
}

function LinkIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}

/* ── Animation Variants ──────────────────────────────────────────────── */

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
} as const;

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0 },
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: { opacity: 1, scale: 1 },
};

/* ── Checkmark Animation (SVG path draw) ─────────────────────────────── */

function AnimatedCheckmark() {
  return (
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.1 }}
      className="w-16 h-16 mx-auto rounded-2xl bg-neon/10 border border-neon/20 flex items-center justify-center"
    >
      <svg
        className="w-8 h-8 text-neon"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <motion.path
          d="M20 6 9 17l-5-5"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.3, ease: "easeOut" }}
        />
      </svg>
    </motion.div>
  );
}

/* ── Page Component ──────────────────────────────────────────────────── */

export default function ShareLinkPage() {
  const { username } = useParams<{ username: string }>();
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const chipScrollRef = useRef<HTMLDivElement>(null);

  const decodedUsername = decodeURIComponent(username);

  // Auto-focus textarea on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      textareaRef.current?.focus();
    }, 600);
    return () => clearTimeout(timer);
  }, []);

  const handleSend = async () => {
    if (!message.trim() || sending) return;
    setError("");
    setSending(true);

    try {
      const res = await fetch("/api/confessions/anon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientUsername: decodedUsername,
          message: message.trim(),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to send");
      }

      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSending(false);
    }
  };

  const handleChipClick = (chip: string) => {
    setMessage(chip);
    // Focus textarea after chip selection
    setTimeout(() => textareaRef.current?.focus(), 50);
  };

  const charWarning = message.length > MAX_CONFESSION_LENGTH - 50;
  const charDanger = message.length > MAX_CONFESSION_LENGTH - 20;

  /* ── Sent Confirmation ─────────────────────────────────────────────── */

  if (sent) {
    return (
      <div className="min-h-dvh flex flex-col bg-void">
        <div className="flex-1 flex flex-col items-center justify-center p-6">
          <motion.div
            className="w-full max-w-sm text-center space-y-8"
            variants={stagger}
            initial="hidden"
            animate="visible"
          >
            <motion.div variants={scaleIn}>
              <AnimatedCheckmark />
            </motion.div>

            <motion.div variants={fadeUp} className="space-y-3">
              <h2 className="text-2xl font-bold font-display">
                Confession Sent
              </h2>
              <p className="text-muted text-base leading-relaxed max-w-[280px] mx-auto">
                Your message was sent anonymously to{" "}
                <span className="text-foreground font-medium">
                  @{decodedUsername}
                </span>
                . Nobody can see who you are&mdash;not even us.
              </p>
            </motion.div>

            <motion.div variants={fadeUp} className="space-y-3 pt-2">
              <button
                onClick={() => {
                  setSent(false);
                  setMessage("");
                }}
                className="btn w-full bg-surface border border-border-subtle text-foreground hover:bg-surface-elevated text-base"
              >
                Send Another
              </button>

              <Link href="/" className="block">
                <div className="btn btn-primary w-full text-base font-semibold">
                  Get Your Own Link
                  <ArrowRightIcon className="w-5 h-5" />
                </div>
              </Link>
            </motion.div>

            <motion.p variants={fadeUp} className="text-sm text-dim">
              Encrypted with FHE on Base
            </motion.p>
          </motion.div>
        </div>
      </div>
    );
  }

  /* ── Send Form ─────────────────────────────────────────────────────── */

  return (
    <div className="min-h-dvh flex flex-col bg-void">
      <div className="flex-1 flex flex-col p-6 pt-10">
        <motion.div
          className="w-full max-w-sm mx-auto space-y-6 flex-1 flex flex-col"
          variants={stagger}
          initial="hidden"
          animate="visible"
        >
          {/* ── Recipient Profile ───────────────────────────────── */}
          <motion.div variants={fadeUp} className="text-center space-y-4">
            <div className="w-20 h-20 rounded-full bg-surface border-2 border-border-subtle mx-auto flex items-center justify-center">
              <UserIcon className="w-10 h-10 text-dim" />
            </div>
            <div className="space-y-1">
              <h1 className="text-2xl font-bold font-display">
                @{decodedUsername}
              </h1>
              <p className="text-muted text-base">
                Send them an anonymous confession
              </p>
            </div>
          </motion.div>

          {/* ── Prompt Chips (horizontal scroll) ───────────────── */}
          <motion.div variants={fadeUp} className="-mx-6">
            <div
              ref={chipScrollRef}
              className="flex gap-2 overflow-x-auto px-6 pb-1"
              style={{
                scrollbarWidth: "none",
                msOverflowStyle: "none",
                WebkitOverflowScrolling: "touch",
              }}
            >
              {PROMPT_CHIPS.map((chip) => (
                <button
                  key={chip}
                  onClick={() => handleChipClick(chip)}
                  className={`
                    shrink-0 px-4 py-2.5 rounded-full text-sm font-medium
                    border transition-all duration-150
                    ${
                      message === chip
                        ? "border-accent bg-accent/10 text-accent-soft"
                        : "border-border-subtle bg-surface text-muted hover:border-border hover:text-foreground"
                    }
                  `}
                  style={{ minHeight: "44px" }}
                >
                  {chip}
                </button>
              ))}
            </div>
          </motion.div>

          {/* ── Message Input ──────────────────────────────────── */}
          <motion.div variants={fadeUp} className="space-y-2 flex-1 flex flex-col">
            <div className="relative flex-1 flex flex-col">
              <textarea
                ref={textareaRef}
                value={message}
                onChange={(e) =>
                  setMessage(e.target.value.slice(0, MAX_CONFESSION_LENGTH))
                }
                placeholder="Type your anonymous confession..."
                autoCapitalize="sentences"
                className="input resize-none flex-1 min-h-[160px] text-base leading-relaxed"
              />
            </div>
            <div className="flex justify-end px-1">
              <span
                className={`text-sm tabular-nums ${
                  charDanger
                    ? "text-danger font-medium"
                    : charWarning
                      ? "text-warm"
                      : "text-dim"
                }`}
              >
                {message.length}/{MAX_CONFESSION_LENGTH}
              </span>
            </div>
          </motion.div>

          {/* ── Error ──────────────────────────────────────────── */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="p-4 rounded-xl bg-danger/10 border border-danger/20 text-danger text-sm text-center flex items-center justify-center gap-2"
              >
                <XCircleIcon className="w-4 h-4 shrink-0" />
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Send Button ────────────────────────────────────── */}
          <motion.div variants={fadeUp} className="space-y-3">
            <button
              onClick={handleSend}
              disabled={!message.trim() || sending}
              className="btn btn-primary w-full text-base font-semibold"
              style={{
                boxShadow: message.trim()
                  ? "0 0 24px rgba(139, 92, 246, 0.2)"
                  : "none",
              }}
            >
              {sending ? (
                <span className="flex items-center justify-center gap-2.5">
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Encrypting...
                </span>
              ) : (
                <>
                  <ShieldLockIcon className="w-5 h-5" />
                  Send Anonymously
                </>
              )}
            </button>

            <p className="text-sm text-dim text-center leading-relaxed">
              Encrypted with FHE. Even we can&rsquo;t see who you are.
            </p>
          </motion.div>
        </motion.div>
      </div>

      {/* ── Bottom Conversion CTA ──────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.5 }}
        className="p-6 pt-0"
      >
        <Link href="/">
          <div className="card p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center shrink-0">
              <LinkIcon className="w-5 h-5 text-accent-soft" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-base font-semibold font-display text-foreground">
                Want your own link?
              </p>
              <p className="text-sm text-muted">
                Get anonymous confessions from your friends
              </p>
            </div>
            <ArrowRightIcon className="w-5 h-5 text-dim shrink-0" />
          </div>
        </Link>
      </motion.div>
    </div>
  );
}
