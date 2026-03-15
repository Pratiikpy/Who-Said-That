"use client";

/**
 * ConfessionQuote
 *
 * Wraps confession card content with a large decorative opening quotation mark
 * positioned in the top-left corner. The quote mark is purely decorative
 * (pointer-events: none, user-select: none, aria-hidden).
 */

interface ConfessionQuoteProps {
  children: React.ReactNode;
  className?: string;
}

export function ConfessionQuote({
  children,
  className = "",
}: ConfessionQuoteProps) {
  return (
    <div className={className} style={{ position: "relative" }}>
      {/* Decorative opening quote mark */}
      <span
        aria-hidden="true"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          fontFamily: "Georgia, 'Times New Roman', serif",
          fontSize: "80px",
          lineHeight: 1,
          color: "rgba(139, 92, 246, 0.06)",
          pointerEvents: "none",
          userSelect: "none",
        }}
      >
        {"\u201C"}
      </span>
      {children}
    </div>
  );
}
