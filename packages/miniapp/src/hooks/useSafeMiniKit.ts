"use client";

// Safe wrapper around useMiniKit that doesn't throw outside Farcaster context
// Returns sensible defaults when not inside MiniKitProvider

import { useState, useEffect } from "react";

interface MiniKitContext {
  user?: {
    fid?: number;
    username?: string;
    displayName?: string;
    pfpUrl?: string;
  };
}

interface SafeMiniKit {
  context: MiniKitContext | null;
  isFrameReady: boolean;
  setFrameReady: () => void;
}

export function useSafeMiniKit(): SafeMiniKit {
  const [context, setContext] = useState<MiniKitContext | null>(null);
  const [isFrameReady, setIsFrameReady] = useState(false);

  // Signal to Farcaster host that app is ready (dismisses splash screen)
  useEffect(() => {
    async function signalReady() {
      try {
        const mod = await import("@farcaster/miniapp-sdk");
        const s = mod.sdk || mod.default;
        await s?.actions?.ready?.();
      } catch {
        // Not inside Farcaster — that's fine
      }
    }
    signalReady();
  }, []);

  // Try to get context from the Farcaster SDK directly
  useEffect(() => {
    async function getContext() {
      try {
        const mod = await import("@farcaster/miniapp-sdk");
        const sdk = mod.sdk || mod.default;
        if (sdk?.context) {
          const ctx = await sdk.context;
          setContext({
            user: {
              fid: ctx?.user?.fid,
              username: ctx?.user?.username,
              displayName: ctx?.user?.displayName,
              pfpUrl: ctx?.user?.pfpUrl,
            },
          });
        }
      } catch {
        // Not in Farcaster context — that's fine
      }
    }
    getContext();
  }, []);

  return {
    context,
    isFrameReady,
    setFrameReady: () => setIsFrameReady(true),
  };
}
