"use client";

import { useEffect } from "react";
import sdk from "@farcaster/miniapp-sdk";

/**
 * Calls sdk.actions.ready() immediately on mount.
 * Must be rendered as early as possible in the component tree.
 * The Base App preview has a ~1 second timeout for this signal.
 */
export function MiniAppReady() {
  useEffect(() => {
    try {
      sdk.actions.ready();
    } catch {
      // Not in a Mini App context
    }
  }, []);

  return null;
}
