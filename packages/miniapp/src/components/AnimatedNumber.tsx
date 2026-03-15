"use client";

import { useEffect, useRef, useState } from "react";

interface AnimatedNumberProps {
  value: number | string;
  duration?: number;
  className?: string;
}

/**
 * Animated number counter that counts up from 0.
 * Like fitness apps and dashboards — numbers roll up on mount.
 */
export function AnimatedNumber({
  value,
  duration = 800,
  className = "",
}: AnimatedNumberProps) {
  const [display, setDisplay] = useState("0");
  const rafRef = useRef<number>(0);
  const startRef = useRef<number>(0);

  // Handle string values like "67%"
  const numericValue = typeof value === "string"
    ? parseFloat(value) || 0
    : value;
  const suffix = typeof value === "string"
    ? value.replace(/[\d.-]/g, "")
    : "";

  useEffect(() => {
    if (numericValue === 0) {
      setDisplay(`0${suffix}`);
      return;
    }

    startRef.current = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startRef.current;
      const progress = Math.min(elapsed / duration, 1);

      // Ease-out cubic for natural deceleration
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(eased * numericValue);

      setDisplay(`${current}${suffix}`);

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [numericValue, suffix, duration]);

  return <span className={`tabular-nums ${className}`}>{display}</span>;
}
