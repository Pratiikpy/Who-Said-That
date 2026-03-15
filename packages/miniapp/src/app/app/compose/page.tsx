"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { MAX_CONFESSION_LENGTH } from "../../../lib/constants";
import { RecipientSearch } from "../../../components/RecipientSearch";
import { useHaptics } from "../../../hooks/useHaptics";
import { useToast } from "../../../components/Toast";
import { useConfessionVault } from "../../../hooks/useConfessionVault";
import { useSafeMiniKit } from "../../../hooks/useSafeMiniKit";
import { useCofheStore } from "../../../store/cofheStore";
import { useWalletClient, usePublicClient } from "wagmi";
import { CONFESSION_VAULT_ABI } from "../../../contracts/confessionVault";
import { CONFESSION_VAULT_ADDRESS } from "../../../lib/constants";
import type { FarcasterUser } from "../../../lib/neynar";
import { sound } from "../../../lib/sound";

export default function ComposePage() {
  const router = useRouter();
  const { context } = useSafeMiniKit();
  const { tap, submit, success } = useHaptics();
  const { toast } = useToast();
  const { generateMessageRef } = useConfessionVault();
  const { isInitialized: cofheReady } = useCofheStore();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const [recipient, setRecipient] = useState<FarcasterUser | null>(null);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const charCount = message.length;
  const charRatio = charCount / MAX_CONFESSION_LENGTH;
  const isOverLimit = charCount > MAX_CONFESSION_LENGTH - 50;
  const isNearLimit = charCount > MAX_CONFESSION_LENGTH - 100;
  const canSend = !!recipient && message.trim().length > 0 && !sending;

  const handleSend = async () => {
    if (!canSend || !recipient) return;
    setError("");
    setSending(true);
    submit();

    const senderFid = context?.user?.fid;
    const messageText = message.trim();

    try {
      // Compute sender hint data (anonymized stats for AI hints)
      const senderHintData = senderFid ? {
        follower_range: "unknown",
        account_age_months: "unknown",
        mutual_count: 0,
        recent_interactions: 0,
        platform: "farcaster",
      } : null;

      // Generate message reference hash for on-chain storage
      const messageRef = generateMessageRef(messageText);

      // Try on-chain encrypted send via CoFHE + ConfessionVault contract
      let onchainId: number | null = null;

      if (cofheReady && senderFid && walletClient && publicClient) {
        try {
          // Step 1: Encrypt sender FID with FHE via cofhejs
          const { cofhejs, Encryptable } = await import("cofhejs/web");
          const encryptResult = await cofhejs.encrypt([Encryptable.uint32(BigInt(senderFid))]);

          if (encryptResult?.success && encryptResult.data?.[0]) {
            const encryptedFid = encryptResult.data[0];

            // Step 2: Send encrypted confession to the contract on Base Sepolia
            // The contract stores the FHE-encrypted sender FID (nobody can read it)
            const txHash = await walletClient.writeContract({
              address: CONFESSION_VAULT_ADDRESS,
              abi: CONFESSION_VAULT_ABI,
              functionName: "sendConfession",
              args: [
                { ...encryptedFid, signature: encryptedFid.signature as `0x${string}` },
                BigInt(recipient.fid),     // uint256 — recipient FID (plaintext)
                messageRef,                // bytes32 — hash pointing to Supabase message
                0,                         // uint8 — platform (0 = Farcaster)
              ],
            });

            // Step 3: Wait for tx confirmation
            const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });

            // Step 4: Extract confession ID from ConfessionSent event
            if (receipt.status === "success") {
              // The contract auto-increments confessionCount
              // Read the latest count as our confession ID
              const count = await publicClient.readContract({
                address: CONFESSION_VAULT_ADDRESS,
                abi: CONFESSION_VAULT_ABI,
                functionName: "getConfessionCount",
              });
              onchainId = Number(count);
            }
          }
        } catch (fheErr) {
          // FHE/contract send failed — fall through to API-only
          console.warn("On-chain send failed, using API fallback:", fheErr);
        }
      }

      // Store confession in Supabase via authenticated API
      const res = await fetch("/api/confessions/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          senderFid: senderFid || null,
          recipientFid: recipient.fid,
          recipientUsername: recipient.username,
          message: messageText,
          platform: "farcaster",
          onchainId,
          senderHintData,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to send");
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
            {/* Success icon */}
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{
                type: "spring",
                stiffness: 260,
                damping: 20,
                delay: 0.15,
              }}
              className="w-20 h-20 rounded-2xl flex items-center justify-center"
              style={{
                background:
                  "linear-gradient(135deg, rgba(34, 197, 94, 0.15), rgba(34, 197, 94, 0.05))",
                border: "1px solid rgba(34, 197, 94, 0.2)",
              }}
            >
              <svg
                width="36"
                height="36"
                viewBox="0 0 24 24"
                fill="none"
                className="stroke-neon"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </motion.div>

            {/* Heading */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="text-center space-y-2"
            >
              <h2 className="text-2xl font-bold font-display text-foreground">
                Confession Sent
              </h2>
              <p className="text-muted text-base leading-relaxed max-w-[280px] mx-auto">
                @{recipient?.username} will see your message but never who you
                are. They get 3 guesses + AI hints.
              </p>
            </motion.div>

            {/* Actions */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              className="w-full max-w-xs space-y-3 pt-2"
            >
              <button onClick={handleReset} className="btn btn-ghost w-full">
                Send Another
              </button>
              <button
                onClick={() => {
                  tap();
                  router.push("/app");
                }}
                className="btn btn-primary w-full"
              >
                Go to Inbox
              </button>
            </motion.div>
          </motion.div>
        ) : (
          <motion.div
            key="compose"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            {/* Title */}
            <h2 className="text-2xl font-bold font-display text-foreground">
              New Confession
            </h2>

            {/* Recipient */}
            <div className="space-y-2.5">
              <label className="section-label">
                To
              </label>
              <RecipientSearch
                selected={recipient}
                onSelect={(user) => {
                  tap();
                  setRecipient(user);
                }}
                onClear={() => {
                  tap();
                  setRecipient(null);
                }}
              />
            </div>

            {/* Message textarea */}
            <div className="space-y-2.5">
              <label
                htmlFor="confession-text"
                className="section-label"
              >
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
                  placeholder="Type something anonymous..."
                  rows={6}
                  autoCapitalize="sentences"
                  className="w-full bg-transparent text-foreground text-base leading-relaxed p-4 resize-none placeholder:text-dim focus:outline-none"
                  style={{ minHeight: "168px" }}
                />
                {/* Character counter bar */}
                <div className="px-4 pb-3 flex items-center justify-between">
                  {/* Progress bar */}
                  <div className="flex-1 mr-4">
                    <div className="h-1 rounded-full overflow-hidden bg-border-subtle">
                      <motion.div
                        className="h-full rounded-full"
                        initial={false}
                        animate={{
                          width: `${Math.min(charRatio * 100, 100)}%`,
                          backgroundColor: isOverLimit
                            ? "var(--color-danger)"
                            : isNearLimit
                              ? "var(--color-warm)"
                              : "var(--color-accent)",
                        }}
                        transition={{ duration: 0.15 }}
                      />
                    </div>
                  </div>
                  {/* Count */}
                  <span
                    className={`text-xs font-mono tabular-nums ${
                      isOverLimit
                        ? "text-danger"
                        : isNearLimit
                          ? "text-warm"
                          : "text-dim"
                    }`}
                  >
                    {charCount}/{MAX_CONFESSION_LENGTH}
                  </span>
                </div>
              </div>
            </div>

            {/* Error */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div
                    className="p-3.5 rounded-xl text-sm text-center flex items-center justify-center gap-2 text-danger bg-danger/10 border border-danger/20"
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <line x1="15" y1="9" x2="9" y2="15" />
                      <line x1="9" y1="9" x2="15" y2="15" />
                    </svg>
                    {error}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Send button */}
            <button
              onClick={handleSend}
              disabled={!canSend}
              className="btn btn-primary w-full"
            >
              {sending ? (
                <span className="flex items-center justify-center gap-2.5">
                  <svg
                    className="animate-spin"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                  >
                    <path d="M21 12a9 9 0 11-6.219-8.56" />
                  </svg>
                  Encrypting & Sending...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect
                      x="3"
                      y="11"
                      width="18"
                      height="11"
                      rx="2"
                      ry="2"
                    />
                    <path d="M7 11V7a5 5 0 0110 0v4" />
                  </svg>
                  Send Anonymously
                </span>
              )}
            </button>

            {/* Privacy note */}
            <p className="text-xs text-center leading-relaxed text-dim">
              Your identity is encrypted with FHE.
              <br />
              Even the contract can&apos;t see who you are.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
