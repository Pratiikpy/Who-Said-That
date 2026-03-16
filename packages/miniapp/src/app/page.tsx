"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import { useSafeMiniKit } from "../hooks/useSafeMiniKit";
import { useMiniKit } from "@coinbase/onchainkit/minikit";
import { motion, AnimatePresence } from "framer-motion";

const CONFESSIONS = [
  {
    text: "You\u2019re the smartest person in every room and everyone knows it except you",
    to: "dwr.eth",
  },
  {
    text: "I should have told you at ETHDenver but I chickened out",
    to: "vitalik",
  },
  {
    text: "Your code is better than mine and I\u2019ve been copying your patterns for months",
    to: "jessepollak",
  },
  {
    text: "I think about our conversation at that party way more than I should",
    to: "anon",
  },
];

/* ── Inline SVG Icons (Lucide-style, 24x24) ─────────────────────────── */

function ShieldLockIcon({ className = "w-6 h-6" }: { className?: string }) {
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

function TargetIcon({ className = "w-6 h-6" }: { className?: string }) {
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
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  );
}

function SparklesIcon({ className = "w-6 h-6" }: { className?: string }) {
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
      <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
      <path d="M20 3v4" />
      <path d="M22 5h-4" />
    </svg>
  );
}

function AppIcon() {
  return (
    <svg
      className="w-8 h-8 text-white"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      <path d="M12 8v1" />
      <path d="M12 12h.01" />
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

/* ── Animation Variants ──────────────────────────────────────────────── */

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.85 },
  visible: { opacity: 1, scale: 1 },
};

/* ── Features Data ───────────────────────────────────────────────────── */

const FEATURES = [
  {
    icon: ShieldLockIcon,
    title: "FHE Encrypted",
    description: "Messages sealed with fully homomorphic encryption. Nobody can read them\u2014not even us.",
  },
  {
    icon: TargetIcon,
    title: "3 Guesses",
    description: "Recipients get three chances to figure out who wrote it. No more, no less.",
  },
  {
    icon: SparklesIcon,
    title: "AI Hints",
    description: "Spend tokens to unlock AI-generated clues about the sender\u2019s identity.",
  },
];

/* ── Page Component ──────────────────────────────────────────────────── */

export default function LandingPage() {
  const { isFrameReady: _safeReady, setFrameReady: safeSetReady, context } = useSafeMiniKit();
  const { setFrameReady: onchainSetReady } = useMiniKit();
  const { isConnected } = useAccount();
  const router = useRouter();
  const [idx, setIdx] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout>(undefined);

  useEffect(() => {
    // Signal ready to BOTH OnchainKit MiniKitProvider AND Farcaster SDK
    onchainSetReady();
    safeSetReady();
  }, [onchainSetReady, safeSetReady]);

  useEffect(() => {
    if (context?.user?.fid && isConnected) router.push("/app");
  }, [context?.user?.fid, isConnected, router]);

  useEffect(() => {
    intervalRef.current = setInterval(
      () => setIdx((p) => (p + 1) % CONFESSIONS.length),
      4000
    );
    return () => clearInterval(intervalRef.current);
  }, []);

  return (
    <div className="min-h-dvh flex flex-col bg-void">
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-16">
        <motion.div
          className="w-full max-w-sm space-y-12"
          variants={stagger}
          initial="hidden"
          animate="visible"
        >
          {/* ── Hero ──────────────────────────────────────────────── */}
          <motion.div variants={fadeUp} className="text-center space-y-5">
            <motion.div
              variants={scaleIn}
              className="w-16 h-16 mx-auto rounded-2xl bg-accent flex items-center justify-center"
              style={{ boxShadow: "0 0 40px rgba(139, 92, 246, 0.2)" }}
            >
              <AppIcon />
            </motion.div>

            <div className="space-y-3">
              <h1 className="text-[34px] font-bold font-display tracking-tight leading-[1.1]">
                Who Said That
              </h1>
              <p className="text-muted text-base leading-relaxed max-w-[280px] mx-auto">
                Anonymous confessions. Encrypted onchain. AI-powered hints.
              </p>
            </div>
          </motion.div>

          {/* ── Confession Preview Card ───────────────────────────── */}
          <motion.div variants={fadeUp} className="card p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
              <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-accent-soft">
                Live Confessions
              </span>
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
              >
                <p className="text-base text-foreground leading-relaxed font-light min-h-[56px]">
                  &ldquo;{CONFESSIONS[idx].text}&rdquo;
                </p>
              </motion.div>
            </AnimatePresence>

            <div className="flex items-center justify-between mt-5 pt-4 border-t border-border-subtle">
              <span className="text-sm text-dim">
                to{" "}
                <span className="text-muted font-medium">
                  @{CONFESSIONS[idx].to}
                </span>
              </span>
              <span className="badge badge-accent">
                <ShieldLockIcon className="w-3 h-3" />
                Encrypted
              </span>
            </div>
          </motion.div>

          {/* ── CTA Button ───────────────────────────────────────── */}
          <motion.div variants={fadeUp} className="space-y-3">
            <button
              onClick={() => router.push("/app")}
              className="btn btn-primary w-full text-base font-semibold"
              style={{ boxShadow: "0 0 24px rgba(139, 92, 246, 0.25)" }}
            >
              Get Your Link
              <ArrowRightIcon className="w-5 h-5" />
            </button>
            <p className="text-sm text-dim text-center">
              Start receiving anonymous confessions in seconds
            </p>
          </motion.div>

          {/* ── Feature Blocks ───────────────────────────────────── */}
          <motion.div variants={fadeUp} className="space-y-3">
            {FEATURES.map((feature, i) => (
              <motion.div
                key={i}
                variants={fadeUp}
                className="card p-5 flex items-start gap-4"
              >
                <div className="w-10 h-10 rounded-xl bg-surface-elevated border border-border-subtle flex items-center justify-center shrink-0">
                  <feature.icon className="w-5 h-5 text-accent-soft" />
                </div>
                <div className="space-y-1 min-w-0">
                  <h3 className="text-base font-semibold font-display text-foreground">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-muted leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </div>

      {/* ── Footer ─────────────────────────────────────────────────── */}
      <footer className="p-6 text-center">
        <p className="text-sm text-dim">
          Base &middot; Fhenix &middot; NVIDIA
        </p>
      </footer>
    </div>
  );
}
