"use client";

import { useState, useCallback, useRef } from "react";

// ─── useOptimistic ──────────────────────────────────────────────────
// Generic hook for optimistic UI updates. Maintains a "confirmed" value
// (the server-truth) and an "optimistic" value (what the user sees).
//
// Usage:
//   const [likes, setOptimistic, revert, confirm] = useOptimistic(0);
//   setOptimistic(likes + 1);         // instant UI update
//   try { await api.like(); confirm(likes + 1); }
//   catch { revert(); }               // roll back on failure

type UseOptimisticReturn<T> = [
  /** Current optimistic value (use this for rendering) */
  value: T,
  /** Immediately set the optimistic value */
  setOptimistic: (value: T) => void,
  /** Revert to the last confirmed value */
  revert: () => void,
  /** Confirm a value as the new server-truth */
  confirm: (value: T) => void,
];

export function useOptimistic<T>(initialValue: T): UseOptimisticReturn<T> {
  const [optimisticValue, setOptimisticValue] = useState<T>(initialValue);
  const confirmedRef = useRef<T>(initialValue);

  const setOptimistic = useCallback((value: T) => {
    setOptimisticValue(value);
  }, []);

  const revert = useCallback(() => {
    setOptimisticValue(confirmedRef.current);
  }, []);

  const confirm = useCallback((value: T) => {
    confirmedRef.current = value;
    setOptimisticValue(value);
  }, []);

  return [optimisticValue, setOptimistic, revert, confirm];
}
