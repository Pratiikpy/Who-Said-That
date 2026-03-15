"use client";

/**
 * HashFingerprint
 *
 * A generative visual pattern unique to each confession, based on its UUID.
 * Renders a 4x4 grid of dots as an inline SVG with positions and opacities
 * derived from the ID's character codes. Purely decorative.
 */

interface HashFingerprintProps {
  id: string;
  size?: number;
  className?: string;
}

export function HashFingerprint({
  id,
  size = 32,
  className = "",
}: HashFingerprintProps) {
  // Strip hyphens, take first 16 chars as seed
  const seed = id.replace(/-/g, "").slice(0, 16).padEnd(16, "0");

  const GRID = 4;
  const DOT_RADIUS = 2;
  const padding = DOT_RADIUS + 1;
  const cellSize = (size - padding * 2) / (GRID - 1);

  const dots: { cx: number; cy: number; opacity: number }[] = [];

  for (let row = 0; row < GRID; row++) {
    for (let col = 0; col < GRID; col++) {
      const charIndex = row * GRID + col;
      const code = seed.charCodeAt(charIndex);

      // Derive a small offset from char code for organic placement
      const offsetX = ((code % 7) - 3) * 0.6;
      const offsetY = ((code % 5) - 2) * 0.6;

      // Opacity range: 0.03 - 0.08
      const opacity = 0.03 + (code % 6) * 0.01;

      dots.push({
        cx: padding + col * cellSize + offsetX,
        cy: padding + row * cellSize + offsetY,
        opacity,
      });
    }
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      fill="none"
      aria-hidden="true"
      className={className}
      style={{ display: "inline-block", flexShrink: 0 }}
    >
      {dots.map((dot, i) => (
        <circle
          key={i}
          cx={dot.cx}
          cy={dot.cy}
          r={DOT_RADIUS}
          fill={`rgba(139, 92, 246, ${dot.opacity})`}
        />
      ))}
    </svg>
  );
}
