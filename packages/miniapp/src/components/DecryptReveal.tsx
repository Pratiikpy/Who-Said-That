"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";

const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@._";

interface DecryptRevealProps {
  text: string;
  isRevealing: boolean;
  onComplete?: () => void;
  className?: string;
}

/**
 * FHE Decrypt Reveal Animation
 *
 * Scrambled characters cycle through random glyphs,
 * then lock in left-to-right with a green flash.
 * The "wow" moment of the app — users screen-record this.
 */
export function DecryptReveal({
  text,
  isRevealing,
  onComplete,
  className = "",
}: DecryptRevealProps) {
  const [displayChars, setDisplayChars] = useState<string[]>([]);
  const [lockedCount, setLockedCount] = useState(0);
  const [glowIntensity, setGlowIntensity] = useState(0);
  const [complete, setComplete] = useState(false);
  const rafRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);

  const CHAR_LOCK_INTERVAL = 80; // ms between each char locking in
  const SCRAMBLE_SPEED = 40; // ms between scramble frame updates
  const INITIAL_SCRAMBLE_DURATION = 400; // ms of pure scrambling before chars start locking

  const scramble = useCallback(() => {
    return Array.from({ length: text.length }, () =>
      GLYPHS[Math.floor(Math.random() * GLYPHS.length)]
    );
  }, [text.length]);

  useEffect(() => {
    if (!isRevealing) {
      // Show encrypted placeholder
      setDisplayChars(scramble());
      setLockedCount(0);
      setGlowIntensity(0);
      setComplete(false);
      return;
    }

    startTimeRef.current = performance.now();
    let lastScrambleTime = 0;
    let currentLocked = 0;

    const animate = (now: number) => {
      const elapsed = now - startTimeRef.current;

      // Phase 1: Pure scramble (0 - INITIAL_SCRAMBLE_DURATION)
      if (elapsed < INITIAL_SCRAMBLE_DURATION) {
        if (now - lastScrambleTime > SCRAMBLE_SPEED) {
          setDisplayChars(scramble());
          lastScrambleTime = now;
        }
        rafRef.current = requestAnimationFrame(animate);
        return;
      }

      // Phase 2: Lock chars left-to-right
      const lockElapsed = elapsed - INITIAL_SCRAMBLE_DURATION;
      const shouldBeLocked = Math.min(
        Math.floor(lockElapsed / CHAR_LOCK_INTERVAL) + 1,
        text.length
      );

      if (shouldBeLocked > currentLocked) {
        currentLocked = shouldBeLocked;
        setLockedCount(currentLocked);
        setGlowIntensity(currentLocked / text.length);
      }

      // Update scrambled portion
      if (now - lastScrambleTime > SCRAMBLE_SPEED) {
        const newChars = text.split("").map((realChar, i) => {
          if (i < currentLocked) return realChar;
          return GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
        });
        setDisplayChars(newChars);
        lastScrambleTime = now;
      }

      // Check completion
      if (currentLocked >= text.length) {
        setDisplayChars(text.split(""));
        setComplete(true);
        setGlowIntensity(1);
        onComplete?.();
        return;
      }

      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isRevealing, text, scramble, onComplete]);

  if (!isRevealing && displayChars.length === 0) {
    return (
      <span className={`font-mono text-dim ${className}`}>
        {"*".repeat(text.length || 8)}
      </span>
    );
  }

  return (
    <motion.span
      className={`font-mono inline-flex flex-wrap ${className}`}
      animate={complete ? { scale: [1, 1.05, 1] } : {}}
      transition={{ duration: 0.3 }}
    >
      {displayChars.map((char, i) => {
        const isLocked = i < lockedCount;
        return (
          <motion.span
            key={i}
            className="inline-block"
            style={{
              color: isLocked ? "#06FFA5" : "#8B5CF6",
              textShadow: isLocked
                ? `0 0 ${8 + glowIntensity * 12}px rgba(6, 255, 165, ${0.4 + glowIntensity * 0.4})`
                : "none",
              transition: "color 0.1s, text-shadow 0.2s",
            }}
            animate={
              isLocked && i === lockedCount - 1
                ? { scale: [1.3, 1], opacity: [0.6, 1] }
                : {}
            }
            transition={{ duration: 0.15 }}
          >
            {char === " " ? "\u00A0" : char}
          </motion.span>
        );
      })}

      {/* Completion glow burst */}
      {complete && (
        <motion.span
          className="absolute inset-0 rounded-lg pointer-events-none"
          initial={{ opacity: 0.8, scale: 1 }}
          animate={{ opacity: 0, scale: 1.5 }}
          transition={{ duration: 0.6 }}
          style={{
            background: "radial-gradient(circle, rgba(6, 255, 165, 0.3) 0%, transparent 70%)",
          }}
        />
      )}
    </motion.span>
  );
}

// ─── Simpler version for confession text entrance ───────────────────

interface DecryptTextProps {
  text: string;
  delay?: number;
  className?: string;
}

export function DecryptText({ text, delay = 0, className = "" }: DecryptTextProps) {
  const [display, setDisplay] = useState("");
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setStarted(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  useEffect(() => {
    if (!started) return;

    let frame = 0;
    const totalFrames = text.length * 2;

    const interval = setInterval(() => {
      frame++;
      const revealedCount = Math.floor(frame / 2);
      const result = text
        .split("")
        .map((char, i) => {
          if (i < revealedCount) return char;
          if (char === " ") return " ";
          return GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
        })
        .join("");

      setDisplay(result);

      if (frame >= totalFrames) {
        setDisplay(text);
        clearInterval(interval);
      }
    }, 30);

    return () => clearInterval(interval);
  }, [started, text]);

  if (!started) return <span className={className}>{"\u00A0"}</span>;

  return <span className={className}>{display}</span>;
}
