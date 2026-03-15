"use client";

import { useCallback } from "react";

// Haptic feedback via Farcaster Mini App SDK
// Falls back silently when not inside Warpcast/Base App
async function getSDK() {
  try {
    const mod = await import("@farcaster/miniapp-sdk");
    return mod.sdk || mod.default;
  } catch {
    return null;
  }
}

export function useHaptics() {
  const tap = useCallback(async () => {
    const sdk = await getSDK();
    try { sdk?.haptics?.impactOccurred?.("light"); } catch {}
  }, []);

  const submit = useCallback(async () => {
    const sdk = await getSDK();
    try { sdk?.haptics?.impactOccurred?.("medium"); } catch {}
  }, []);

  const heavy = useCallback(async () => {
    const sdk = await getSDK();
    try { sdk?.haptics?.impactOccurred?.("heavy"); } catch {}
  }, []);

  const success = useCallback(async () => {
    const sdk = await getSDK();
    try { sdk?.haptics?.notificationOccurred?.("success"); } catch {}
  }, []);

  const error = useCallback(async () => {
    const sdk = await getSDK();
    try { sdk?.haptics?.notificationOccurred?.("error"); } catch {}
  }, []);

  const select = useCallback(async () => {
    const sdk = await getSDK();
    try { sdk?.haptics?.selectionChanged?.(); } catch {}
  }, []);

  return { tap, submit, heavy, success, error, select };
}
