"use client";

import { motion } from "framer-motion";
import { classNames } from "../lib/utils";

// ─── SurfaceCard ─────────────────────────────────────────────────────
// Utility card with solid surface background. No glass/blur effects.
// Supports optional gradient border, entrance animation, and press states.

interface SurfaceCardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  gradient?: boolean;
  onClick?: () => void;
  delay?: number;
  as?: "div" | "button";
}

export function GlassCard({
  children,
  className,
  hover = false,
  gradient = false,
  onClick,
  delay = 0,
  as = "div",
}: SurfaceCardProps) {
  const Component = as === "button" ? motion.button : motion.div;

  return (
    <Component
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
      onClick={onClick}
      className={classNames(
        "relative rounded-xl overflow-hidden",
        hover && "cursor-pointer transition-all duration-200 active:scale-[0.98]",
        hover && "hover:bg-surface-elevated hover:border-border hover:-translate-y-0.5",
        className
      )}
      style={{ WebkitTapHighlightColor: "transparent" }}
      whileTap={hover ? { scale: 0.98 } : undefined}
    >
      {/* Gradient border overlay */}
      {gradient && (
        <div
          className="absolute inset-0 rounded-xl pointer-events-none"
          style={{
            padding: "1px",
            background: "linear-gradient(135deg, rgba(139,92,246,0.3) 0%, transparent 50%, rgba(34,197,94,0.2) 100%)",
            WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
            WebkitMaskComposite: "xor",
            maskComposite: "exclude",
          }}
        />
      )}

      {/* Solid surface background */}
      <div
        className={classNames(
          "relative rounded-xl",
          gradient
            ? "bg-surface border-0"
            : "bg-surface border border-border-subtle"
        )}
      >
        {children}
      </div>
    </Component>
  );
}

// ─── Skeleton Card ───────────────────────────────────────────────────
// Loading placeholder with shimmer animation. Uses the global .skeleton
// class from globals.css for the shimmer keyframes.

export function SkeletonCard({ lines = 3 }: { lines?: number }) {
  return (
    <div className="rounded-xl bg-surface border border-border-subtle p-4 space-y-3">
      {/* Header row */}
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full skeleton" />
        <div className="h-3 w-24 skeleton rounded" />
        <div className="ml-auto h-3 w-12 skeleton rounded" />
      </div>

      {/* Content lines */}
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="skeleton rounded"
          style={{ height: "12px", width: `${90 - i * 15}%` }}
        />
      ))}

      {/* Badge row */}
      <div className="flex gap-2 pt-1">
        <div className="h-6 w-20 rounded-full skeleton" />
        <div className="h-6 w-16 rounded-full skeleton" />
      </div>
    </div>
  );
}
