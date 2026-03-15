// ─── Animation System ──────────────────────────────────────────────────
// Apple HIG-inspired spring configs, reusable variants, and duration constants.
// Built for framer-motion v12+. Every animation in the app should source its
// physics from these constants so motion feels consistent and premium.

import type { Transition, Variants } from "framer-motion";

// ─── Spring Configurations ─────────────────────────────────────────────
// Tuned to match Apple's spring curves across different interaction types.
// Each config is a complete framer-motion transition object.

/** Snappy response for cards, buttons, toggles — fast feedback. */
export const SPRING_SNAPPY: Transition = {
  type: "spring",
  stiffness: 300,
  damping: 24,
};

/** Smooth, cushioned movement for modals, sheets, overlays. */
export const SPRING_SMOOTH: Transition = {
  type: "spring",
  stiffness: 200,
  damping: 28,
};

/** Tight, near-critical damping for tabs, segment controls, indicators. */
export const SPRING_TIGHT: Transition = {
  type: "spring",
  stiffness: 500,
  damping: 30,
};

/** Elastic overshoot for pull-to-refresh, drag gestures, bouncy reveals. */
export const SPRING_ELASTIC: Transition = {
  type: "spring",
  stiffness: 150,
  damping: 15,
};

/** Gentle drift for page transitions, background parallax, hero sections. */
export const SPRING_GENTLE: Transition = {
  type: "spring",
  stiffness: 120,
  damping: 20,
};

// ─── Duration Constants ────────────────────────────────────────────────
// For tween-based animations where springs aren't appropriate (opacity fades,
// color transitions, SVG path animations).

/** Micro-interactions: icon swaps, opacity toggles. */
export const DURATION_FAST = 0.15;

/** Standard interactions: menu open, tooltip appear. */
export const DURATION_NORMAL = 0.25;

/** Emphatic transitions: page enter, onboarding steps. */
export const DURATION_SLOW = 0.4;

// ─── Easing Curves ─────────────────────────────────────────────────────
// Custom cubic bezier curves for tween fallbacks.

/** Apple's default ease-out — fast start, gentle stop. */
export const EASE_OUT: [number, number, number, number] = [0.25, 0.46, 0.45, 0.94];

/** Smooth ease-in-out for symmetrical transitions. */
export const EASE_IN_OUT: [number, number, number, number] = [0.42, 0, 0.58, 1];

// ─── Reusable Animation Variants ───────────────────────────────────────
// Standard enter/exit pairs that can be passed directly to motion components
// via the `variants` prop, or spread into `initial`/`animate`/`exit`.

export const fadeIn: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

export const fadeUp: Variants = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
};

export const fadeDown: Variants = {
  initial: { opacity: 0, y: -16 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 8 },
};

export const scaleIn: Variants = {
  initial: { opacity: 0, scale: 0.92 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95 },
};

export const slideUp: Variants = {
  initial: { y: "100%" },
  animate: { y: 0 },
  exit: { y: "100%" },
};

export const slideDown: Variants = {
  initial: { y: "-100%" },
  animate: { y: 0 },
  exit: { y: "-100%" },
};

// ─── Stagger Containers ────────────────────────────────────────────────
// Parent variants that orchestrate staggered child animations.
// Usage:
//   <motion.div variants={staggerContainer(0.06)} initial="initial" animate="animate">
//     <motion.div variants={fadeUp} />
//     <motion.div variants={fadeUp} />
//   </motion.div>

/**
 * Creates a stagger container variant with configurable delay between children.
 * @param staggerDelay — seconds between each child animation (default 0.06)
 * @param delayChildren — seconds before the first child starts (default 0.1)
 */
export function staggerContainer(
  staggerDelay = 0.06,
  delayChildren = 0.1,
): Variants {
  return {
    initial: {},
    animate: {
      transition: {
        staggerChildren: staggerDelay,
        delayChildren,
      },
    },
  };
}

// ─── Card Entrance ─────────────────────────────────────────────────────
// Index-aware entrance variant for lists and grids. Each card staggers in
// based on its position, creating a cascade effect.
// Usage:
//   <motion.div
//     variants={cardEntrance}
//     custom={index}
//     initial="initial"
//     animate="animate"
//   />

export const cardEntrance: Variants = {
  initial: {
    opacity: 0,
    y: 20,
    scale: 0.97,
  },
  animate: (index: number = 0) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      ...SPRING_SNAPPY,
      delay: index * 0.06,
    },
  }),
  exit: {
    opacity: 0,
    y: -8,
    scale: 0.98,
    transition: {
      duration: DURATION_FAST,
      ease: EASE_OUT,
    },
  },
};

// ─── Helpers ───────────────────────────────────────────────────────────

/**
 * Merges a spring config with a delay value. Useful for inline transitions.
 * @example transition={withDelay(SPRING_SNAPPY, 0.2)}
 */
export function withDelay(spring: Transition, delay: number): Transition {
  return { ...spring, delay };
}

/**
 * Returns true if the user prefers reduced motion.
 * Safe to call on the server (returns false).
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
