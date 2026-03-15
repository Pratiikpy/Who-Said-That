"use client";

import { motion } from "framer-motion";
import { classNames } from "../lib/utils";

// ─── Smart Empty State ──────────────────────────────────────────────
// Context-aware empty state component. Each `type` renders a distinct
// icon, copy, and call-to-action that fits the user's current situation.

type EmptyStateType =
  | "first-visit"
  | "no-confessions"
  | "all-read"
  | "error"
  | "offline";

interface SmartEmptyStateProps {
  type: EmptyStateType;
  onAction?: () => void;
}

// ─── Inline SVG Icons ───────────────────────────────────────────────

function WelcomeIcon() {
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
      <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 006 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5" />
      <path d="M9 18h6" />
      <path d="M10 22h4" />
    </svg>
  );
}

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

function CheckCircleIcon() {
  return (
    <svg
      width="40"
      height="40"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#22C55E"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <motion.path
        d="M9 12l2 2 4-4"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.6, delay: 0.3, ease: "easeOut" }}
      />
    </svg>
  );
}

function AlertTriangleIcon() {
  return (
    <svg
      width="40"
      height="40"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#EF4444"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

function WifiOffIcon() {
  return (
    <svg
      width="40"
      height="40"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#F59E0B"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="1" y1="1" x2="23" y2="23" />
      <path d="M16.72 11.06A10.94 10.94 0 0119 12.55" />
      <path d="M5 12.55a10.94 10.94 0 015.17-2.39" />
      <path d="M10.71 5.05A16 16 0 0122.56 9" />
      <path d="M1.42 9a15.91 15.91 0 014.7-2.88" />
      <path d="M8.53 16.11a6 6 0 016.95 0" />
      <line x1="12" y1="20" x2="12.01" y2="20" />
    </svg>
  );
}

// ─── Config per type ────────────────────────────────────────────────

interface EmptyStateConfig {
  icon: React.ReactNode;
  heading: string;
  description: string;
  cta: string | null;
  iconBg: string;
}

const configs: Record<EmptyStateType, EmptyStateConfig> = {
  "first-visit": {
    icon: <WelcomeIcon />,
    heading: "Welcome!",
    description:
      "Share your anonymous link to start receiving encrypted confessions. Only you can decrypt them.",
    cta: "Share Your Link",
    iconBg: "bg-accent-muted border-border-subtle",
  },
  "no-confessions": {
    icon: <EmptyInboxIcon />,
    heading: "Nobody has confessed yet",
    description:
      "Your inbox is waiting. Dare your friends to confess something anonymous -- they won't be able to resist.",
    cta: "Dare Them",
    iconBg: "bg-accent-muted border-border-subtle",
  },
  "all-read": {
    icon: <CheckCircleIcon />,
    heading: "All caught up",
    description:
      "You've read every confession. New ones will appear here as they arrive.",
    cta: null,
    iconBg: "bg-neon-muted border-border-subtle",
  },
  error: {
    icon: <AlertTriangleIcon />,
    heading: "Couldn't load confessions",
    description:
      "Something went wrong on our end. Your encrypted data is safe -- give it another try.",
    cta: "Retry",
    iconBg: "bg-[rgba(239,68,68,0.12)] border-border-subtle",
  },
  offline: {
    icon: <WifiOffIcon />,
    heading: "You're offline",
    description:
      "We'll sync your confessions automatically when your connection is back.",
    cta: null,
    iconBg: "bg-[rgba(245,158,11,0.12)] border-border-subtle",
  },
};

// ─── Component ──────────────────────────────────────────────────────

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.15,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 14 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] as const },
  },
};

const iconVariants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.5, ease: [0.34, 1.56, 0.64, 1] as const },
  },
};

export function SmartEmptyState({ type, onAction }: SmartEmptyStateProps) {
  const config = configs[type];

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="text-center py-20 px-6"
    >
      {/* Icon container */}
      <motion.div
        variants={iconVariants}
        className={classNames(
          "w-20 h-20 mx-auto rounded-3xl border flex items-center justify-center mb-6",
          config.iconBg
        )}
      >
        {config.icon}
      </motion.div>

      {/* Heading */}
      <motion.h3
        variants={itemVariants}
        className="text-lg font-semibold text-foreground mb-2"
      >
        {config.heading}
      </motion.h3>

      {/* Description */}
      <motion.p
        variants={itemVariants}
        className="text-sm text-dim max-w-[280px] mx-auto mb-6 leading-relaxed"
      >
        {config.description}
      </motion.p>

      {/* CTA button */}
      {config.cta && onAction && (
        <motion.div variants={itemVariants}>
          <button
            onClick={onAction}
            className="btn btn-primary max-w-[240px] mx-auto"
          >
            {config.cta}
          </button>
        </motion.div>
      )}
    </motion.div>
  );
}
