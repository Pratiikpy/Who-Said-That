"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { DecryptReveal } from "./DecryptReveal";
import { useHaptics } from "../hooks/useHaptics";

/**
 * RevealSequence
 *
 * Orchestrated 3.2-second reveal animation when a guess is correct.
 * Timeline:
 *   T+0ms    — Full-screen flash (#06FFA5 at 15% opacity) + heavy haptic
 *   T+100ms  — Checkmark circle scales in (spring)
 *   T+500ms  — "Identity Revealed!" fades up (Clash Display Bold, 24px, green glow)
 *   T+800ms  — "It was..." subtext fades up (14px, dim)
 *   T+1000ms — DecryptReveal starts (character-by-character with green glow)
 *   T+2400ms — Username complete + success haptic
 *   T+2700ms — Card scales 1.03 -> 1.0
 *   T+3200ms — onComplete()
 */

interface RevealSequenceProps {
  username: string;
  guessCount: number;
  onComplete?: () => void;
}

export default function RevealSequence({
  username,
  guessCount,
  onComplete,
}: RevealSequenceProps) {
  const [showFlash, setShowFlash] = useState(true);
  const [showCheck, setShowCheck] = useState(false);
  const [showTitle, setShowTitle] = useState(false);
  const [showSubtext, setShowSubtext] = useState(false);
  const [showDecrypt, setShowDecrypt] = useState(false);
  const [decryptComplete, setDecryptComplete] = useState(false);
  const [doPulse, setDoPulse] = useState(false);

  const haptics = useHaptics();
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const schedule = useCallback((fn: () => void, delay: number) => {
    const t = setTimeout(fn, delay);
    timersRef.current.push(t);
    return t;
  }, []);

  useEffect(() => {
    // T+0ms: Heavy haptic
    haptics.heavy();

    // T+100ms: Checkmark
    schedule(() => setShowCheck(true), 100);

    // T+500ms: Title
    schedule(() => setShowTitle(true), 500);

    // T+700ms: Flash has faded — remove from DOM
    schedule(() => setShowFlash(false), 700);

    // T+800ms: Subtext
    schedule(() => setShowSubtext(true), 800);

    // T+1000ms: Start decrypt
    schedule(() => setShowDecrypt(true), 1000);

    // T+2400ms: Decrypt complete + success haptic
    schedule(() => {
      setDecryptComplete(true);
      haptics.success();
    }, 2400);

    // T+2700ms: Pulse card
    schedule(() => setDoPulse(true), 2700);

    // T+3200ms: Complete
    schedule(() => {
      onComplete?.();
    }, 3200);

    return () => {
      timersRef.current.forEach(clearTimeout);
      timersRef.current = [];
    };
    // Run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className="relative flex flex-col items-center justify-center w-full py-8"
      style={{ minHeight: 280 }}
    >
      {/* T+0ms: Full-screen flash overlay */}
      <AnimatePresence>
        {showFlash && (
          <motion.div
            className="fixed inset-0 z-50 pointer-events-none"
            style={{ backgroundColor: "rgba(6, 255, 165, 0.15)" }}
            initial={{ opacity: 1 }}
            animate={{ opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
          />
        )}
      </AnimatePresence>

      {/* Card container with T+2700ms scale pulse */}
      <motion.div
        className="flex flex-col items-center gap-4 w-full"
        animate={doPulse ? { scale: [1.03, 1] } : { scale: 1 }}
        transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
      >
        {/* T+100ms: Checkmark circle */}
        <AnimatePresence>
          {showCheck && (
            <motion.div
              className="flex items-center justify-center rounded-full"
              style={{
                width: 56,
                height: 56,
                backgroundColor: "#06FFA5",
              }}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{
                type: "spring",
                stiffness: 400,
                damping: 20,
              }}
            >
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#09090B"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </motion.div>
          )}
        </AnimatePresence>

        {/* T+500ms: "Identity Revealed!" */}
        <AnimatePresence>
          {showTitle && (
            <motion.h2
              className="font-display font-bold text-center"
              style={{
                fontSize: 24,
                color: "#06FFA5",
                textShadow:
                  "0 0 20px rgba(6, 255, 165, 0.4), 0 0 40px rgba(6, 255, 165, 0.2)",
              }}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.4,
                ease: [0.25, 0.46, 0.45, 0.94],
              }}
            >
              Identity Revealed!
            </motion.h2>
          )}
        </AnimatePresence>

        {/* T+800ms: "It was..." */}
        <AnimatePresence>
          {showSubtext && (
            <motion.p
              className="text-dim text-center"
              style={{ fontSize: 14 }}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.35,
                ease: [0.25, 0.46, 0.45, 0.94],
              }}
            >
              It was...
            </motion.p>
          )}
        </AnimatePresence>

        {/* T+1000ms: DecryptReveal for username */}
        <div className="h-10 flex items-center justify-center">
          {showDecrypt && (
            <DecryptReveal
              text={username}
              isRevealing={true}
              className="text-xl font-bold font-display"
            />
          )}
        </div>

        {/* Guess count badge (visible after decrypt completes) */}
        <AnimatePresence>
          {decryptComplete && (
            <motion.div
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
              style={{
                backgroundColor: "rgba(6, 255, 165, 0.08)",
                border: "1px solid rgba(6, 255, 165, 0.15)",
              }}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{
                duration: 0.3,
                ease: [0.25, 0.46, 0.45, 0.94],
              }}
            >
              <span
                className="text-xs font-medium"
                style={{ color: "#06FFA5" }}
              >
                Guessed in {guessCount}{" "}
                {guessCount === 1 ? "try" : "tries"}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
