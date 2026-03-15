"use client";

import { useState, useEffect, useRef, useCallback } from "react";

// ─── Scroll-Linked Header Transform ─────────────────────────────────
// Returns interpolated values for header animation based on scroll
// position. Uses requestAnimationFrame for smooth 60fps updates.
//
// Usage:
//   const { headerScale, titleOpacity, inlineTitleOpacity, bgBlur, bgOpacity } = useScrollHeader();
//   <header style={{ transform: `scale(${headerScale})`, backdropFilter: `blur(${bgBlur}px)` }}>

interface ScrollHeaderValues {
  /** Raw scroll offset in pixels */
  scrollY: number;
  /** Header container scale: 1.0 → 0.85 */
  headerScale: number;
  /** Large title opacity: 1.0 → 0 (fades out as you scroll) */
  titleOpacity: number;
  /** Inline/compact title opacity: 0 → 1.0 (fades in as you scroll) */
  inlineTitleOpacity: number;
  /** Backdrop blur in px: 0 → 20 */
  bgBlur: number;
  /** Header background opacity: 0 → 0.95 */
  bgOpacity: number;
}

const THRESHOLD = 100;

/** Clamp a value between min and max */
function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** Linear interpolation from `from` to `to` by normalized progress `t` (0..1) */
function lerp(from: number, to: number, t: number): number {
  return from + (to - from) * t;
}

export function useScrollHeader(): ScrollHeaderValues {
  const [values, setValues] = useState<ScrollHeaderValues>({
    scrollY: 0,
    headerScale: 1,
    titleOpacity: 1,
    inlineTitleOpacity: 0,
    bgBlur: 0,
    bgOpacity: 0,
  });

  const rafId = useRef<number>(0);
  const ticking = useRef(false);

  const update = useCallback(() => {
    const y = window.scrollY;
    const progress = clamp(y / THRESHOLD, 0, 1);

    setValues({
      scrollY: y,
      headerScale: lerp(1.0, 0.85, progress),
      titleOpacity: lerp(1.0, 0, progress),
      inlineTitleOpacity: lerp(0, 1.0, progress),
      bgBlur: lerp(0, 20, progress),
      bgOpacity: lerp(0, 0.95, progress),
    });

    ticking.current = false;
  }, []);

  const onScroll = useCallback(() => {
    if (!ticking.current) {
      ticking.current = true;
      rafId.current = requestAnimationFrame(update);
    }
  }, [update]);

  useEffect(() => {
    // Set initial values based on current scroll position (handles
    // cases where the page is already scrolled on mount, e.g. browser
    // back-forward cache).
    update();

    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", onScroll);
      if (rafId.current) {
        cancelAnimationFrame(rafId.current);
      }
    };
  }, [onScroll, update]);

  return values;
}
