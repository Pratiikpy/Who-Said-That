"use client";

import { useState, useCallback, useRef } from "react";

// ─── useOptimisticList ──────────────────────────────────────────────
// Specialized optimistic-UI hook for ordered lists (confessions, messages,
// comments, etc.). Every item must carry a string `id`. Optimistically
// added items are decorated with `__pending: true` so the UI can show
// a "sending..." indicator, skeleton pulse, or reduced opacity.
//
// Usage:
//   const { items, addOptimistic, removeOptimistic, revertLast, confirmAll }
//     = useOptimisticList<Confession>(serverConfessions);
//
//   // User submits a new confession
//   const temp = { id: crypto.randomUUID(), message: text, ... };
//   addOptimistic(temp);                    // instantly appears at top
//   try { await api.post(temp); confirmAll(); }
//   catch { revertLast(); }                 // vanishes on failure

/** Marks an item as pending (optimistically added, not yet confirmed). */
export type OptimisticItem<T> = T & { __pending?: boolean };

/** The operations returned by the hook. */
export interface UseOptimisticListReturn<T extends { id: string }> {
  /** The current list, including any pending items at the top. */
  items: OptimisticItem<T>[];
  /** Immediately prepend an item to the list with `__pending: true`. */
  addOptimistic: (item: T) => void;
  /** Immediately remove an item by id (optimistic delete). */
  removeOptimistic: (id: string) => void;
  /** Undo the most recent optimistic add or remove. */
  revertLast: () => void;
  /** Mark all pending items as confirmed (strips `__pending` flag). */
  confirmAll: () => void;
  /** Replace the entire confirmed list (e.g. after a server refetch). */
  setConfirmed: (items: T[]) => void;
}

// Internal representation of an optimistic operation for the undo stack.
type Operation<T extends { id: string }> =
  | { type: "add"; item: T }
  | { type: "remove"; item: OptimisticItem<T>; index: number };

export function useOptimisticList<T extends { id: string }>(
  initialItems: T[],
): UseOptimisticListReturn<T> {
  const [items, setItems] = useState<OptimisticItem<T>[]>(
    () => initialItems.map((item) => ({ ...item })),
  );

  // Stack of operations so we can revert the most recent one.
  const opsRef = useRef<Operation<T>[]>([]);

  // Confirmed snapshot — the server-truth baseline.
  const confirmedRef = useRef<T[]>(initialItems);

  // ── addOptimistic ───────────────────────────────────────────────
  const addOptimistic = useCallback((item: T) => {
    const pending: OptimisticItem<T> = { ...item, __pending: true };
    opsRef.current.push({ type: "add", item });
    setItems((prev) => [pending, ...prev]);
  }, []);

  // ── removeOptimistic ────────────────────────────────────────────
  const removeOptimistic = useCallback((id: string) => {
    setItems((prev) => {
      const index = prev.findIndex((i) => i.id === id);
      if (index === -1) return prev;
      const removed = prev[index];
      opsRef.current.push({ type: "remove", item: removed, index });
      return prev.filter((_, idx) => idx !== index);
    });
  }, []);

  // ── revertLast ──────────────────────────────────────────────────
  const revertLast = useCallback(() => {
    const lastOp = opsRef.current.pop();
    if (!lastOp) return;

    setItems((prev) => {
      if (lastOp.type === "add") {
        // Remove the first item matching the added id
        const idx = prev.findIndex((i) => i.id === lastOp.item.id);
        if (idx === -1) return prev;
        return [...prev.slice(0, idx), ...prev.slice(idx + 1)];
      }

      // lastOp.type === "remove" — re-insert the removed item at its
      // original position (clamped to current length).
      const insertAt = Math.min(lastOp.index, prev.length);
      const next = [...prev];
      next.splice(insertAt, 0, lastOp.item);
      return next;
    });
  }, []);

  // ── confirmAll ──────────────────────────────────────────────────
  const confirmAll = useCallback(() => {
    opsRef.current = [];
    setItems((prev) => {
      const confirmed = prev.map(({ __pending, ...rest }) => ({
        ...rest,
      })) as OptimisticItem<T>[];
      confirmedRef.current = confirmed as T[];
      return confirmed;
    });
  }, []);

  // ── setConfirmed ────────────────────────────────────────────────
  // Replaces the full list (e.g., after a server refetch). Any pending
  // items that are not present in the new list are preserved at the top,
  // keeping the optimistic illusion until confirmed or reverted.
  const setConfirmed = useCallback((newItems: T[]) => {
    confirmedRef.current = newItems;
    setItems((prev) => {
      const newIds = new Set(newItems.map((i) => i.id));
      // Keep pending items that haven't appeared in the server response yet.
      const survivingPending = prev.filter(
        (i) => i.__pending && !newIds.has(i.id),
      );
      const confirmedList: OptimisticItem<T>[] = newItems.map((item) => ({
        ...item,
      }));
      return [...survivingPending, ...confirmedList];
    });
  }, []);

  return {
    items,
    addOptimistic,
    removeOptimistic,
    revertLast,
    confirmAll,
    setConfirmed,
  };
}
