"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";

// ─── FloatingReaction ──────────────────────────────────────────────────
// When a reaction button is tapped, a small emoji floats upward with
// physics-inspired motion: slight horizontal drift, gravity-curved
// vertical path, and opacity fade — like Instagram's heart animation
// or iMessage's reaction pop.
//
// Usage:
//   const { particles, emit, ParticleLayer } = useFloatingReaction();
//
//   <button onClick={(e) => { emit("fire", e); handleReaction(); }}>
//     Fire
//   </button>
//   <ParticleLayer />

// ─── Types ─────────────────────────────────────────────────────────────

interface Particle {
  id: string;
  emoji: string;
  x: number;
  y: number;
}

interface FloatingReactionProps {
  /** The emoji or text to float upward. */
  emoji: string;
  /** Starting X position (px from left of viewport). */
  x: number;
  /** Starting Y position (px from top of viewport). */
  y: number;
  /** Called when the animation completes and the particle should be removed. */
  onComplete: () => void;
}

// ─── Single Floating Particle ──────────────────────────────────────────

function FloatingParticle({ emoji, x, y, onComplete }: FloatingReactionProps) {
  const shouldReduceMotion = useReducedMotion();

  // Randomize horizontal drift so particles don't all follow the same path
  const driftX = (Math.random() - 0.5) * 40;

  // Random scale variation for visual interest
  const peakScale = 1.1 + Math.random() * 0.3;

  if (shouldReduceMotion) {
    // Still show the emoji briefly, just without movement
    return (
      <motion.span
        initial={{ opacity: 1 }}
        animate={{ opacity: 0 }}
        transition={{ duration: 0.4 }}
        onAnimationComplete={onComplete}
        style={{
          position: "fixed",
          left: x,
          top: y,
          fontSize: 24,
          pointerEvents: "none",
          zIndex: 9999,
          userSelect: "none",
        }}
      >
        {emoji}
      </motion.span>
    );
  }

  return (
    <motion.span
      initial={{
        opacity: 1,
        scale: 0.5,
        x: 0,
        y: 0,
      }}
      animate={{
        opacity: [1, 1, 0.8, 0],
        scale: [0.5, peakScale, 1, 0.8],
        // Horizontal drift — slight random sway
        x: [0, driftX * 0.3, driftX * 0.7, driftX],
        // Vertical path with gravity curve:
        // Fast upward launch, decelerating, then slight gravity pull-back
        y: [0, -60, -100, -120],
      }}
      transition={{
        duration: 0.8,
        ease: [0.2, 0.8, 0.4, 1], // Gravity-like: fast start, slow apex
        times: [0, 0.3, 0.65, 1], // Keyframe timing
      }}
      onAnimationComplete={onComplete}
      style={{
        position: "fixed",
        left: x,
        top: y,
        fontSize: 24,
        pointerEvents: "none",
        zIndex: 9999,
        userSelect: "none",
        willChange: "transform, opacity",
        lineHeight: 1,
      }}
    >
      {emoji}
    </motion.span>
  );
}

// ─── Hook: useFloatingReaction ──────────────────────────────────────────
// Manages the particle state and provides an emit function + render layer.
// This is the recommended API — keeps the parent component clean.
//
// Example:
//   const { emit, ParticleLayer } = useFloatingReaction();
//   <button onClick={(e) => emit("fire", e)}>Fire</button>
//   <ParticleLayer />

export function useFloatingReaction() {
  const [particles, setParticles] = useState<Particle[]>([]);

  const emit = useCallback(
    (emoji: string, event: React.MouseEvent | React.TouchEvent) => {
      const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

      // Center the particle on the button
      const x = rect.left + rect.width / 2 - 12; // offset by half emoji size
      const y = rect.top - 4;

      setParticles((prev) => [...prev, { id, emoji, x, y }]);
    },
    [],
  );

  const removeParticle = useCallback((id: string) => {
    setParticles((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const ParticleLayer = useCallback(() => {
    return (
      <AnimatePresence>
        {particles.map((p) => (
          <FloatingParticle
            key={p.id}
            emoji={p.emoji}
            x={p.x}
            y={p.y}
            onComplete={() => removeParticle(p.id)}
          />
        ))}
      </AnimatePresence>
    );
  }, [particles, removeParticle]);

  return { particles, emit, ParticleLayer };
}

// ─── Standalone Component ──────────────────────────────────────────────
// For cases where you just want to render a single floating reaction
// from known coordinates without the hook pattern.

export function FloatingReaction(props: FloatingReactionProps) {
  return <FloatingParticle {...props} />;
}
