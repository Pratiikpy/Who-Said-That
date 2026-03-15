"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion, useReducedMotion } from "framer-motion";

// ─── BreathingAnimation ────────────────────────────────────────────────
// Wraps children with a subtle, continuous scale pulse when the user has
// been idle for a configurable duration. The effect draws attention to
// interactive elements without being distracting — like the way Apple's
// download button gently pulses on the App Store.
//
// The breathing pauses immediately on any pointer, keyboard, touch, or
// scroll interaction and resumes after the idle threshold is met again.
// Fully respects prefers-reduced-motion.

interface BreathingAnimationProps {
  children: React.ReactNode;
  /** Seconds of idle time before breathing begins. Default: 5 */
  idleThreshold?: number;
  /** Peak scale factor of the breath. Default: 1.02 */
  scaleAmount?: number;
  /** Full breath cycle duration in seconds. Default: 4 */
  cycleDuration?: number;
  /** Additional CSS class on the wrapper. */
  className?: string;
}

const INTERACTION_EVENTS = [
  "pointerdown",
  "pointermove",
  "keydown",
  "scroll",
  "touchstart",
  "wheel",
] as const;

export function BreathingAnimation({
  children,
  idleThreshold = 5,
  scaleAmount = 1.02,
  cycleDuration = 4,
  className,
}: BreathingAnimationProps) {
  const shouldReduceMotion = useReducedMotion();
  const [isIdle, setIsIdle] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetIdleTimer = useCallback(() => {
    // User interacted — stop breathing immediately
    setIsIdle(false);

    // Clear any pending timer
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
    }

    // Start a new idle countdown
    timerRef.current = setTimeout(() => {
      setIsIdle(true);
    }, idleThreshold * 1000);
  }, [idleThreshold]);

  useEffect(() => {
    // Kick off the initial idle timer on mount
    resetIdleTimer();

    // Attach listeners to the window so ALL interactions are caught,
    // not just those on the wrapped element.
    for (const event of INTERACTION_EVENTS) {
      window.addEventListener(event, resetIdleTimer, { passive: true });
    }

    return () => {
      for (const event of INTERACTION_EVENTS) {
        window.removeEventListener(event, resetIdleTimer);
      }
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
      }
    };
  }, [resetIdleTimer]);

  // If user prefers reduced motion, render children without the wrapper
  if (shouldReduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      animate={
        isIdle
          ? {
              scale: [1, scaleAmount, 1],
              transition: {
                duration: cycleDuration,
                ease: "easeInOut",
                repeat: Infinity,
                repeatType: "loop",
              },
            }
          : {
              scale: 1,
              transition: { duration: 0.2, ease: "easeOut" },
            }
      }
    >
      {children}
    </motion.div>
  );
}
