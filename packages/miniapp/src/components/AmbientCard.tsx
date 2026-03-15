"use client";

import { motion } from "framer-motion";
import { classNames } from "../lib/utils";

// ─── AmbientCard ────────────────────────────────────────────────────
// Premium card with simulated overhead ambient lighting, inspired by
// Linear, Raycast, and Arc Browser. A solid-surface card with:
//   - Inset top-edge highlight (light hitting the top edge)
//   - Faint radial gradient bleed from top-center
//   - Subtle hover state that brightens the highlight
// Drop-in replacement for GlassCard / .card usage.

interface AmbientCardProps {
  children: React.ReactNode;
  className?: string;
  /** Enable hover interactions (brighten highlight, lift) */
  hover?: boolean;
  onClick?: () => void;
  /** Stagger delay for entrance animation (seconds) */
  delay?: number;
}

export function AmbientCard({
  children,
  className,
  hover = false,
  onClick,
  delay = 0,
}: AmbientCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.4,
        delay,
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
      onClick={onClick}
      className={classNames(
        "group relative rounded-[20px]",
        hover && "cursor-pointer",
        className,
      )}
      style={{ WebkitTapHighlightColor: "transparent" }}
      whileTap={hover ? { scale: 0.98 } : undefined}
      whileHover={hover ? { y: -2 } : undefined}
    >
      {/* ── Ambient light bleed ─────────────────────────────────────── */}
      {/* Faint radial glow from top-center simulating overhead light   */}
      <div
        className="pointer-events-none absolute inset-0 rounded-[20px] overflow-hidden"
        aria-hidden="true"
      >
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 60% 40% at 50% 0%, rgba(255,255,255,0.03) 0%, transparent 70%)",
          }}
        />
      </div>

      {/* ── Card surface ────────────────────────────────────────────── */}
      <div
        className="relative rounded-[20px] transition-shadow duration-200"
        style={{
          backgroundColor: "#141416",
          border: "1px solid #1E1E21",
          boxShadow: [
            // Top-edge highlight (inset): simulates light hitting the top
            "inset 0 1px 0 rgba(255,255,255,0.04)",
            // Soft outer shadow for depth
            "0 2px 8px rgba(0,0,0,0.25)",
          ].join(", "),
        }}
      >
        {/* Hover overlay — brightens top highlight from 0.04 → 0.06 */}
        {hover && (
          <div
            className={classNames(
              "pointer-events-none absolute inset-0 rounded-[20px] opacity-0 transition-opacity duration-200",
              "group-hover:opacity-100",
            )}
            aria-hidden="true"
            style={{
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.02)",
              background:
                "radial-gradient(ellipse 50% 30% at 50% 0%, rgba(255,255,255,0.015) 0%, transparent 70%)",
            }}
          />
        )}

        {children}
      </div>
    </motion.div>
  );
}
