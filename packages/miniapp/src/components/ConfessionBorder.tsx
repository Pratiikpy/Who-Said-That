"use client";

import { motion } from "framer-motion";
import type { ReactNode, CSSProperties } from "react";

// ─── Confession Card Morphology ─────────────────────────────────────
// Wraps a confession card with a subtle left-border accent whose color
// and behavior varies by confession type. Only the mystery-admirer type
// uses framer-motion for its color-cycling animation; all other types
// are pure CSS.

type ConfessionType =
  | "crush"
  | "roast"
  | "compliment"
  | "secret"
  | "mystery-admirer"
  | "default";

interface ConfessionBorderProps {
  type?: ConfessionType;
  children: ReactNode;
}

// ─── Border Definitions ─────────────────────────────────────────────

const BORDER_WIDTH = "3px";

const GRADIENT_BORDERS: Record<string, string> = {
  crush: "linear-gradient(to bottom, #ec4899, transparent)",
  roast: "linear-gradient(to bottom, #60a5fa, transparent)",
  compliment: "linear-gradient(to bottom, #34d399, transparent)",
};

// ─── Secret: pulsing dim gray border (CSS animation) ────────────────

const SECRET_KEYFRAMES = `
@keyframes confession-border-pulse {
  0%, 100% { opacity: 0.35; }
  50% { opacity: 0.7; }
}
`;

function injectSecretKeyframes() {
  if (typeof document === "undefined") return;
  const id = "confession-border-pulse-style";
  if (document.getElementById(id)) return;
  const style = document.createElement("style");
  style.id = id;
  style.textContent = SECRET_KEYFRAMES;
  document.head.appendChild(style);
}

// ─── Static Gradient Border ─────────────────────────────────────────

function GradientBorder({
  gradient,
  children,
}: {
  gradient: string;
  children: ReactNode;
}) {
  const style: CSSProperties = {
    position: "relative",
  };

  const beforeStyle: CSSProperties = {
    content: '""',
    position: "absolute",
    top: 0,
    left: 0,
    bottom: 0,
    width: BORDER_WIDTH,
    background: gradient,
    borderRadius: "3px 0 0 3px",
    pointerEvents: "none",
  };

  return (
    <div style={style}>
      <div style={beforeStyle} aria-hidden="true" />
      {children}
    </div>
  );
}

// ─── Secret Pulsing Border ──────────────────────────────────────────

function SecretBorder({ children }: { children: ReactNode }) {
  injectSecretKeyframes();

  const borderStyle: CSSProperties = {
    content: '""',
    position: "absolute",
    top: 0,
    left: 0,
    bottom: 0,
    width: BORDER_WIDTH,
    background: "#6b7280",
    borderRadius: "3px 0 0 3px",
    pointerEvents: "none",
    animation: "confession-border-pulse 2.4s ease-in-out infinite",
  };

  return (
    <div style={{ position: "relative" }}>
      <div style={borderStyle} aria-hidden="true" />
      {children}
    </div>
  );
}

// ─── Mystery Admirer: animated color-cycling border ─────────────────

const CYCLE_COLORS = [
  "#8b5cf6", // violet
  "#6ee7b7", // mint
  "#8b5cf6", // violet
];

function MysteryAdmirerBorder({ children }: { children: ReactNode }) {
  return (
    <div style={{ position: "relative" }}>
      <motion.div
        aria-hidden="true"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          bottom: 0,
          width: BORDER_WIDTH,
          borderRadius: "3px 0 0 3px",
          pointerEvents: "none",
        }}
        animate={{
          background: CYCLE_COLORS,
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      {children}
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────

export function ConfessionBorder({
  type = "default",
  children,
}: ConfessionBorderProps) {
  // Default type: render children without any extra border wrapper
  if (type === "default") {
    return <>{children}</>;
  }

  // Static gradient types
  const gradient = GRADIENT_BORDERS[type];
  if (gradient) {
    return <GradientBorder gradient={gradient}>{children}</GradientBorder>;
  }

  // Secret: pulsing gray border
  if (type === "secret") {
    return <SecretBorder>{children}</SecretBorder>;
  }

  // Mystery admirer: animated color-cycling border
  if (type === "mystery-admirer") {
    return <MysteryAdmirerBorder>{children}</MysteryAdmirerBorder>;
  }

  return <>{children}</>;
}
