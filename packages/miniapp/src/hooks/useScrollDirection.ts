"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// ─── useScrollDirection ──────────────────────────────────────────────
// Detects scroll direction using requestAnimationFrame for performance.
// Returns whether the bottom nav should be hidden (scrolling down fast)
// or visible (scrolling up, idle, or near top).
//
// Integration with BottomTabs:
//
//   1. In your page/layout, call:
//        const { shouldHideNav } = useScrollDirection();
//
//   2. Pass `shouldHideNav` to BottomTabs via context, prop, or Zustand store.
//      Example with a thin Zustand store:
//
//        // store/uiStore.ts
//        import { create } from "zustand";
//        export const useUIStore = create<{ hideNav: boolean; setHideNav: (v: boolean) => void }>(
//          (set) => ({ hideNav: false, setHideNav: (hideNav) => set({ hideNav }) })
//        );
//
//   3. In your layout/page component:
//        const { shouldHideNav } = useScrollDirection();
//        const setHideNav = useUIStore((s) => s.setHideNav);
//        useEffect(() => { setHideNav(shouldHideNav); }, [shouldHideNav, setHideNav]);
//
//   4. In BottomTabs (or a wrapper around it):
//        const hideNav = useUIStore((s) => s.hideNav);
//        <nav style={{
//          transform: hideNav ? "translateY(100%)" : "translateY(0)",
//          transition: "transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
//        }}>
//          ...existing BottomTabs content...
//        </nav>
//

export type ScrollDirection = "up" | "down" | "idle";

interface ScrollDirectionResult {
  /** Current scroll direction */
  direction: ScrollDirection;
  /** True when nav should be hidden (fast downward scroll) */
  shouldHideNav: boolean;
  /** Current scroll position in px */
  scrollY: number;
}

/** Minimum velocity (px/frame at ~60fps) to count as "fast" scrolling down */
const VELOCITY_THRESHOLD = 10;

/** Pixels from top where nav always stays visible */
const TOP_ZONE = 50;

/** Ms of no movement before direction resets to "idle" */
const IDLE_TIMEOUT = 1000;

/**
 * Tracks scroll direction using rAF and returns whether bottom nav should hide.
 *
 * @param scrollElement - Optional ref to a scrollable element.
 *                        If omitted, uses `window` scroll.
 */
export function useScrollDirection(
  scrollElement?: React.RefObject<HTMLElement | null>,
): ScrollDirectionResult {
  const [direction, setDirection] = useState<ScrollDirection>("idle");
  const [shouldHideNav, setShouldHideNav] = useState(false);
  const [scrollY, setScrollY] = useState(0);

  // All mutable state lives in refs to keep the rAF callback stable
  const lastY = useRef(0);
  const rafId = useRef(0);
  const idleTimerId = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isHidden = useRef(false);

  const getScrollY = useCallback((): number => {
    if (scrollElement?.current) {
      return scrollElement.current.scrollTop;
    }
    return window.scrollY ?? document.documentElement.scrollTop ?? 0;
  }, [scrollElement]);

  // Single effect manages the entire lifecycle: listener, rAF, idle timer
  useEffect(() => {
    const target = scrollElement?.current ?? window;

    function clearIdle() {
      if (idleTimerId.current !== null) {
        clearTimeout(idleTimerId.current);
        idleTimerId.current = null;
      }
    }

    function startIdle() {
      clearIdle();
      idleTimerId.current = setTimeout(() => {
        setDirection("idle");
        if (isHidden.current) {
          isHidden.current = false;
          setShouldHideNav(false);
        }
      }, IDLE_TIMEOUT);
    }

    function tick() {
      const currentY = getScrollY();
      const delta = currentY - lastY.current;

      setScrollY(currentY);

      // Near the top: always show nav
      if (currentY <= TOP_ZONE) {
        if (isHidden.current) {
          isHidden.current = false;
          setShouldHideNav(false);
        }
        setDirection("idle");
        lastY.current = currentY;
        return;
      }

      if (delta > VELOCITY_THRESHOLD) {
        // Scrolling DOWN fast
        setDirection("down");
        if (!isHidden.current) {
          isHidden.current = true;
          setShouldHideNav(true);
        }
        clearIdle();
        startIdle();
      } else if (delta < -VELOCITY_THRESHOLD) {
        // Scrolling UP fast
        setDirection("up");
        if (isHidden.current) {
          isHidden.current = false;
          setShouldHideNav(false);
        }
        clearIdle();
        startIdle();
      } else if (Math.abs(delta) <= 2) {
        // Barely moving -- let idle timer handle it
        if (idleTimerId.current === null) {
          startIdle();
        }
      }

      lastY.current = currentY;
    }

    function onScroll() {
      if (rafId.current) {
        cancelAnimationFrame(rafId.current);
      }
      rafId.current = requestAnimationFrame(tick);
    }

    // Initialize
    lastY.current = getScrollY();

    target.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      target.removeEventListener("scroll", onScroll);
      if (rafId.current) cancelAnimationFrame(rafId.current);
      clearIdle();
    };
  }, [scrollElement, getScrollY]);

  return { direction, shouldHideNav, scrollY };
}
