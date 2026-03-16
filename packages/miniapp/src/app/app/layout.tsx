"use client";

import { useEffect, useRef, useState } from "react";
import { useAccount } from "wagmi";
import { useMiniKit } from "@coinbase/onchainkit/minikit";
import { useCofhe } from "../../hooks/useCofhe";
import { BottomTabs } from "../../components/BottomTabs";
import { ConnectWalletButton } from "../../components/ConnectWalletButton";
// import { Onboarding } from "../../components/Onboarding";
import { useScrollDirection } from "../../hooks/useScrollDirection";
import { useTimeTheme } from "../../hooks/useTimeTheme";
import { useScrollHeader } from "../../hooks/useScrollHeader";
import CipherGrid from "../../components/CipherGrid";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { isConnected } = useAccount();
  const { context } = useMiniKit();
  const { isInitializing } = useCofhe();
  const [showInitMsg, setShowInitMsg] = useState(false);
  const { shouldHideNav } = useScrollDirection();

  // Only show "Initializing encryption..." after 3s delay, hide after 15s
  useEffect(() => {
    if (!isInitializing) { setShowInitMsg(false); return; }
    const show = setTimeout(() => setShowInitMsg(true), 3000);
    const hide = setTimeout(() => setShowInitMsg(false), 15000);
    return () => { clearTimeout(show); clearTimeout(hide); };
  }, [isInitializing]);
  const { gradientColor } = useTimeTheme();
  const { bgBlur, bgOpacity, inlineTitleOpacity } = useScrollHeader();

  // ── Sync user profile to Supabase on first load ──────────────────
  // This ensures the users table has a record with the correct FID so
  // that anonymous confessions sent via share links can be matched.
  const hasSynced = useRef(false);
  const user = context?.user;

  useEffect(() => {
    if (hasSynced.current || !user?.fid || !user?.username) return;
    hasSynced.current = true;

    fetch("/api/users/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fid: user.fid,
        username: user.username,
        displayName: user.displayName || null,
        pfpUrl: user.pfpUrl || null,
      }),
    }).catch(() => {
      // Fire-and-forget — don't block the UI if sync fails
      hasSynced.current = false; // allow retry on next render
    });
  }, [user?.fid, user?.username, user?.displayName, user?.pfpUrl]);

  if (!isConnected) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center p-6 bg-void">
        <div className="text-center space-y-6 max-w-sm">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-accent flex items-center justify-center shadow-lg"
            style={{ boxShadow: "0 0 30px rgba(139, 92, 246, 0.25)" }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
              <path d="M12 8v1" />
              <path d="M12 12h.01" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold font-display tracking-tight">Who Said That</h1>
          <p className="text-muted text-sm leading-relaxed">
            Anonymous confessions encrypted onchain. Connect to get your link.
          </p>
          <ConnectWalletButton />
        </div>
      </div>
    );
  }

  const greeting = user?.displayName
    ? `Hi, ${user.displayName.split(" ")[0]}!`
    : "Welcome back!";

  return (
    <div className="min-h-dvh bg-void pb-tabs">
      {/* Ambient cipher grid background — shifts color by time of day */}
      <CipherGrid color={gradientColor} />

      {/* Header — personalized like Amazon dark mode */}
      <header
        className="sticky top-0 z-40 px-5 pt-3 pb-2"
        style={{
          backgroundColor: `rgba(10, 10, 12, ${bgOpacity})`,
          backdropFilter: `blur(${bgBlur}px)`,
          WebkitBackdropFilter: `blur(${bgBlur}px)`,
        }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold font-display tracking-tight">{greeting}</h1>
            {/* Inline compact title fades in as user scrolls */}
            {inlineTitleOpacity > 0.1 && (
              <p
                className="text-xs text-dim mt-0.5"
                style={{ opacity: inlineTitleOpacity }}
              >
                Who Said That
              </p>
            )}
            {showInitMsg && (
              <p className="text-xs text-dim flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                Initializing encryption...
              </p>
            )}
          </div>
          {user?.pfpUrl ? (
            <img
              src={user.pfpUrl}
              alt={user.displayName || ""}
              className="w-9 h-9 rounded-full border-2 border-border"
            />
          ) : (
            <div className="w-9 h-9 rounded-full bg-surface border-2 border-border flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#71717A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="8" r="4" />
                <path d="M20 21a8 8 0 10-16 0" />
              </svg>
            </div>
          )}
        </div>
      </header>

      <main className="relative z-10 pb-20">{children}</main>

      {/* BottomTabs handles its own transform — no wrapper div.
          A parent with transform breaks position:fixed (CSS spec). */}
      <BottomTabs hidden={shouldHideNav} />
    </div>
  );
}
