"use client";

import { useCallback, useRef, useState } from "react";
import { useHaptics } from "../hooks/useHaptics";

// ─── Pull-to-Refresh Wrapper ─────────────────────────────────────────
// Native-feeling pull-to-refresh for touch devices.
// Wraps scrollable content and shows a custom SVG spinner on pull.

type PullState = "idle" | "pulling" | "ready" | "refreshing";

const THRESHOLD = 80; // px of pull distance to trigger refresh
const MAX_PULL = 140; // px cap so the indicator doesn't fly off screen
const INDICATOR_SIZE = 36;

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
}

// ── Circular Arrow SVG ───────────────────────────────────────────────
// A clean circular-arrow icon (like iOS native pull-to-refresh).
// `progress` 0..1 controls partial reveal, `spinning` triggers animation.

function RefreshIndicator({
  progress,
  spinning,
}: {
  progress: number;
  spinning: boolean;
}) {
  // Stroke dasharray trick: draw more of the arc as user pulls
  const circumference = 2 * Math.PI * 10; // r=10
  const dashOffset = circumference * (1 - Math.min(progress, 1));

  return (
    <svg
      width={INDICATOR_SIZE}
      height={INDICATOR_SIZE}
      viewBox="0 0 24 24"
      fill="none"
      style={{
        transform: `rotate(${spinning ? 0 : progress * 270}deg)`,
        animation: spinning ? "ptr-spin 0.7s linear infinite" : "none",
      }}
    >
      {/* Background track */}
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="rgba(139, 92, 246, 0.15)"
        strokeWidth="2.2"
        fill="none"
      />
      {/* Progress arc */}
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="#8B5CF6"
        strokeWidth="2.2"
        fill="none"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={spinning ? circumference * 0.25 : dashOffset}
        style={{
          transition: spinning ? "none" : "stroke-dashoffset 0.05s linear",
          transformOrigin: "center",
        }}
      />
      {/* Arrow head — only visible when progress > 30% */}
      {(progress > 0.3 || spinning) && (
        <path
          d="M16.5 8.5L12 4L7.5 8.5"
          stroke="#8B5CF6"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={spinning ? 1 : Math.min((progress - 0.3) / 0.3, 1)}
          style={{
            transform: `translateY(${spinning ? 0 : (1 - Math.min(progress, 1)) * 3}px)`,
            transition: "opacity 0.1s",
          }}
        />
      )}
    </svg>
  );
}

export function PullToRefresh({ onRefresh, children }: PullToRefreshProps) {
  const [state, setState] = useState<PullState>("idle");
  const [pullDistance, setPullDistance] = useState(0);

  const touchStartY = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const isTracking = useRef(false);

  const { tap, success } = useHaptics();

  // ── Helpers ──────────────────────────────────────────────────────

  const getScrollTop = useCallback((): number => {
    if (!containerRef.current) return 1; // treat as "not at top"
    // Walk up to find the nearest scrollable ancestor, or use window
    let el: HTMLElement | null = containerRef.current;
    while (el) {
      if (el.scrollTop > 0) return el.scrollTop;
      if (el === document.documentElement || el === document.body) {
        return window.scrollY || document.documentElement.scrollTop || 0;
      }
      el = el.parentElement;
    }
    return window.scrollY || 0;
  }, []);

  // ── Touch Handlers ───────────────────────────────────────────────

  const onTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (state === "refreshing") return;
      if (getScrollTop() > 0) return; // only activate at scroll top

      touchStartY.current = e.touches[0].clientY;
      isTracking.current = true;
      setState("pulling");
    },
    [state, getScrollTop],
  );

  const onTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!isTracking.current || state === "refreshing") return;

      const deltaY = e.touches[0].clientY - touchStartY.current;

      // Only track downward pulls
      if (deltaY <= 0) {
        setPullDistance(0);
        setState("pulling");
        return;
      }

      // Re-check scroll position in case user scrolled during the gesture
      if (getScrollTop() > 0) {
        isTracking.current = false;
        setPullDistance(0);
        setState("idle");
        return;
      }

      // Prevent native overscroll/bounce in Farcaster WebView
      e.preventDefault();

      // Apply rubber-band resistance: diminishing returns past threshold
      const resistedDistance = deltaY < THRESHOLD
        ? deltaY
        : THRESHOLD + (deltaY - THRESHOLD) * 0.4;

      const clamped = Math.min(resistedDistance, MAX_PULL);
      setPullDistance(clamped);

      // Transition to "ready" when past threshold
      if (clamped >= THRESHOLD && state !== "ready") {
        setState("ready");
        tap(); // haptic tick when passing threshold
      } else if (clamped < THRESHOLD && state === "ready") {
        setState("pulling");
      }
    },
    [state, getScrollTop, tap],
  );

  const onTouchEnd = useCallback(async () => {
    if (!isTracking.current) return;
    isTracking.current = false;

    if (state === "ready") {
      // Snap indicator to a fixed position during refresh
      setState("refreshing");
      setPullDistance(THRESHOLD * 0.65);

      try {
        await onRefresh();
        success(); // haptic success on completion
      } catch {
        // Swallow errors — caller should handle them
      }

      // Spring back
      setState("idle");
      setPullDistance(0);
    } else {
      // Released below threshold — spring back
      setState("idle");
      setPullDistance(0);
    }
  }, [state, onRefresh, success]);

  // ── Derived values ───────────────────────────────────────────────

  const progress = Math.min(pullDistance / THRESHOLD, 1);
  const isActive = state !== "idle";

  return (
    <div
      ref={containerRef}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      style={{ overscrollBehavior: "contain", position: "relative" }}
    >
      {/* Indicator container */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: `${pullDistance}px`,
          overflow: "hidden",
          opacity: isActive ? 1 : 0,
          transition: state === "idle"
            ? "height 0.35s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.2s ease"
            : "opacity 0.15s ease",
          zIndex: 30,
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            opacity: progress,
            transform: `scale(${0.5 + progress * 0.5})`,
            transition: state === "idle" ? "all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)" : "none",
          }}
        >
          <RefreshIndicator
            progress={progress}
            spinning={state === "refreshing"}
          />
        </div>

        {/* "Release to refresh" text — appears above threshold */}
        {state === "ready" && (
          <span
            style={{
              position: "absolute",
              bottom: 4,
              fontSize: 11,
              fontWeight: 500,
              color: "#8B5CF6",
              letterSpacing: "0.02em",
              opacity: Math.min((progress - 0.85) / 0.15, 1),
            }}
          >
            Release to refresh
          </span>
        )}
      </div>

      {/* Content — shifted down by pull distance */}
      <div
        style={{
          transform: `translateY(${pullDistance}px)`,
          transition: state === "idle"
            ? "transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)"
            : "none",
          willChange: isActive ? "transform" : "auto",
        }}
      >
        {children}
      </div>

      {/* Keyframe for spinner rotation — injected once */}
      <style>{`
        @keyframes ptr-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
