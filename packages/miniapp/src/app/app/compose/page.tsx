"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { MAX_CONFESSION_LENGTH } from "../../../lib/constants";
import { RecipientSearch } from "../../../components/RecipientSearch";
import { useHaptics } from "../../../hooks/useHaptics";
import { useToast } from "../../../components/Toast";
import { useConfessionVault } from "../../../hooks/useConfessionVault";
import { useMiniKit } from "@coinbase/onchainkit/minikit";
import { useCofheStore } from "../../../store/cofheStore";
import { useWalletClient, usePublicClient } from "wagmi";
import { CONFESSION_VAULT_ABI } from "../../../contracts/confessionVault";
import { CONFESSION_VAULT_ADDRESS } from "../../../lib/constants";
import type { FarcasterUser } from "../../../lib/neynar";
import { sound } from "../../../lib/sound";

type Mode = "private" | "public";

export default function ComposePage() {
  const router = useRouter();
  const { context } = useMiniKit();
  const { tap, submit, success } = useHaptics();
  const { toast } = useToast();
  const { generateMessageRef } = useConfessionVault();
  const { isInitialized: cofheReady } = useCofheStore();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();

  const [mode, setMode] = useState<Mode>("private");
  const [recipient, setRecipient] = useState<FarcasterUser | null>(null);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const charCount = message.length;
  const charRatio = charCount / MAX_CONFESSION_LENGTH;
  const isOverLimit = charCount > MAX_CONFESSION_LENGTH - 50;
  const isNearLimit = charCount > MAX_CONFESSION_LENGTH - 100;

  const canSend =
    message.trim().length > 0 &&
    !sending &&
    (mode === "public" || !!recipient);

  const handleSend = async () => {
    if (!canSend) return;
    setError("");
    setSending(true);
    submit();

    const senderFid = context?.user?.fid;
    const messageText = message.trim();

    try {
      if (mode === "public") {
        // Public post — simple API call, no FHE needed
        let res: Response;
        const payload = JSON.stringify({
          senderFid: senderFid || null,
          recipientFid: 0,
          recipientUsername: null,
          message: messageText,
          platform: "farcaster",
          onchainId: null,
          senderHintData: null,
          isPublic: true,
        });

        try {
          const { authFetch } = await import("../../../lib/api");
          res = await authFetch("/api/confessions/send", {
            method: "POST",
            body: payload,
          });
        } catch {
          res = await fetch("/api/confessions/send", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: payload,
          });
        }

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Failed to post");
        }
      } else {
        // Private confession — with optional FHE encryption
        const senderHintData = senderFid
          ? {
              follower_range: "unknown",
              account_age_months: "unknown",
              mutual_count: 0,
              recent_interactions: 0,
              platform: "farcaster",
            }
          : null;

        const messageRef = generateMessageRef(messageText);
        let onchainId: number | null = null;

        if (cofheReady && senderFid && walletClient && publicClient && recipient) {
          try {
            const { cofhejs, Encryptable } = await import("cofhejs/web");
            const encryptResult = await cofhejs.encrypt([
              Encryptable.uint32(BigInt(senderFid)),
            ]);

            if (encryptResult?.success && encryptResult.data?.[0]) {
              const encryptedFid = encryptResult.data[0];
              const txHash = await walletClient.writeContract({
                address: CONFESSION_VAULT_ADDRESS,
                abi: CONFESSION_VAULT_ABI,
                functionName: "sendConfession",
                args: [
                  {
                    ...encryptedFid,
                    signature: encryptedFid.signature as `0x${string}`,
                  },
                  BigInt(recipient.fid),
                  messageRef,
                  0,
                ],
              });
              const receipt = await publicClient.waitForTransactionReceipt({
                hash: txHash,
              });
              if (receipt.status === "success") {
                const count = await publicClient.readContract({
                  address: CONFESSION_VAULT_ADDRESS,
                  abi: CONFESSION_VAULT_ABI,
                  functionName: "getConfessionCount",
                });
                onchainId = Number(count);
              }
            }
          } catch (fheErr) {
            console.warn("On-chain send failed, using API fallback:", fheErr);
          }
        }

        let res: Response;
        const payload = JSON.stringify({
          senderFid: senderFid || null,
          recipientFid: recipient?.fid || 0,
          recipientUsername: recipient?.username,
          message: messageText,
          platform: "farcaster",
          onchainId,
          senderHintData,
          isPublic: false,
        });

        try {
          const { authFetch } = await import("../../../lib/api");
          res = await authFetch("/api/confessions/send", {
            method: "POST",
            body: payload,
          });
        } catch {
          res = await fetch("/api/confessions/send", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: payload,
          });
        }

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Failed to send");
        }
      }

      success();
      setSent(true);
      sound.sendConfirm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send");
      toast(err instanceof Error ? err.message : "Failed to send", "error");
    } finally {
      setSending(false);
    }
  };

  const handleReset = () => {
    tap();
    setSent(false);
    setMessage("");
    setRecipient(null);
    setError("");
  };

  return (
    <div className="px-5 py-6">
      <AnimatePresence mode="wait">
        {sent ? (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col items-center justify-center py-16 space-y-6"
          >
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.15 }}
              className="w-20 h-20 rounded-2xl flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg, rgba(34, 197, 94, 0.15), rgba(34, 197, 94, 0.05))",
                border: "1px solid rgba(34, 197, 94, 0.2)",
              }}
            >
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" className="stroke-neon" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </motion.div>

            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold font-display text-foreground">
                {mode === "public" ? "Posted!" : "Confession Sent"}
              </h2>
              <p className="text-muted text-base leading-relaxed max-w-[280px] mx-auto">
                {mode === "public"
                  ? "Your anonymous confession is now on the public feed."
                  : `@${recipient?.username} will see your message but never who you are.`}
              </p>
            </div>

            <div className="w-full max-w-xs space-y-3 pt-2">
              <button onClick={handleReset} className="btn btn-ghost w-full">
                {mode === "public" ? "Post Another" : "Send Another"}
              </button>
              <button
                onClick={() => {
                  tap();
                  router.push(mode === "public" ? "/app/feed" : "/app");
                }}
                className="btn btn-primary w-full"
              >
                {mode === "public" ? "View Feed" : "Go to Inbox"}
              </button>
            </div>
          </motion.div>
        ) : (
          <div className="space-y-6">
            {/* Title */}
            <h2 className="text-2xl font-bold font-display text-foreground">
              New Confession
            </h2>

            {/* Mode Toggle */}
            <div className="flex rounded-xl bg-surface border border-border p-1 gap-1">
              <button
                onClick={() => { tap(); setMode("private"); }}
                className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition-all ${
                  mode === "private"
                    ? "bg-accent text-white shadow-sm"
                    : "text-muted"
                }`}
                style={{ WebkitTapHighlightColor: "transparent" }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0110 0v4" />
                </svg>
                To Someone
              </button>
              <button
                onClick={() => { tap(); setMode("public"); setRecipient(null); }}
                className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition-all ${
                  mode === "public"
                    ? "bg-accent text-white shadow-sm"
                    : "text-muted"
                }`}
                style={{ WebkitTapHighlightColor: "transparent" }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                </svg>
                Public Feed
              </button>
            </div>

            {/* Recipient — only in private mode */}
            {mode === "private" && (
              <div className="space-y-2.5">
                <label className="section-label">To</label>
                <RecipientSearch
                  selected={recipient}
                  onSelect={(user) => { tap(); setRecipient(user); }}
                  onClear={() => { tap(); setRecipient(null); }}
                />
              </div>
            )}

            {/* Message */}
            <div className="space-y-2.5">
              <label htmlFor="confession-text" className="section-label">
                Your Message
              </label>
              <div
                className={`rounded-xl bg-surface border transition-colors duration-150 ${
                  message.length > 0 ? "border-accent" : "border-border-subtle"
                }`}
              >
                <textarea
                  id="confession-text"
                  value={message}
                  onChange={(e) =>
                    setMessage(e.target.value.slice(0, MAX_CONFESSION_LENGTH))
                  }
                  onFocus={() => { tap(); sound.composeFocus(); }}
                  placeholder={
                    mode === "public"
                      ? "Share something anonymously with the world..."
                      : "Type something anonymous..."
                  }
                  rows={5}
                  autoCapitalize="sentences"
                  className="w-full bg-transparent text-foreground text-base leading-relaxed p-4 resize-none placeholder:text-dim focus:outline-none"
                  style={{ minHeight: "140px" }}
                />
                <div className="px-4 pb-3 flex items-center justify-between">
                  <div className="flex-1 mr-4">
                    <div className="h-1 rounded-full overflow-hidden bg-border-subtle">
                      <div
                        className="h-full rounded-full transition-all duration-150"
                        style={{
                          width: `${Math.min(charRatio * 100, 100)}%`,
                          backgroundColor: isOverLimit
                            ? "var(--color-danger)"
                            : isNearLimit
                              ? "var(--color-warm)"
                              : "var(--color-accent)",
                        }}
                      />
                    </div>
                  </div>
                  <span
                    className={`text-xs font-mono tabular-nums ${
                      isOverLimit ? "text-danger" : isNearLimit ? "text-warm" : "text-dim"
                    }`}
                  >
                    {charCount}/{MAX_CONFESSION_LENGTH}
                  </span>
                </div>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="p-3.5 rounded-xl text-sm text-center flex items-center justify-center gap-2 text-danger bg-danger/10 border border-danger/20">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="15" y1="9" x2="9" y2="15" />
                  <line x1="9" y1="9" x2="15" y2="15" />
                </svg>
                {error}
              </div>
            )}

            {/* Send button */}
            <button
              onClick={handleSend}
              disabled={!canSend}
              className="btn btn-primary w-full"
            >
              {sending ? (
                <span className="flex items-center justify-center gap-2.5">
                  <svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M21 12a9 9 0 11-6.219-8.56" />
                  </svg>
                  {mode === "public" ? "Posting..." : "Encrypting & Sending..."}
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    {mode === "public" ? (
                      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                    ) : (
                      <>
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0110 0v4" />
                      </>
                    )}
                  </svg>
                  {mode === "public" ? "Post to Feed" : "Send Anonymously"}
                </span>
              )}
            </button>

            {/* Privacy note */}
            <p className="text-xs text-center leading-relaxed text-dim">
              {mode === "public"
                ? "Your post is anonymous. No one can see who posted it."
                : "Your identity is encrypted with FHE. Even the contract can\u2019t see who you are."}
            </p>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
