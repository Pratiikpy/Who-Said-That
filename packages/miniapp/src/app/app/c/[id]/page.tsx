"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useWalletClient, usePublicClient } from "wagmi";
import { useMiniKit } from "@coinbase/onchainkit/minikit";
import { CONFESSION_VAULT_ABI } from "../../../../contracts/confessionVault";
import { CONFESSION_VAULT_ADDRESS } from "../../../../lib/constants";
import {
  supabase,
  setCurrentFid,
  type DbConfession,
  type DbHint,
  type DbThread,
} from "../../../../lib/supabase";
import { getTimeAgo, copyToClipboard } from "../../../../lib/utils";
import { MAX_GUESSES, HINT_PRICES } from "../../../../lib/constants";
import { useToast } from "../../../../components/Toast";
import { useHaptics } from "../../../../hooks/useHaptics";
import { useConfessionVault } from "../../../../hooks/useConfessionVault";
import { sound } from "../../../../lib/sound";
import { ConfessionQuote } from "../../../../components/ConfessionQuote";
import { HashFingerprint } from "../../../../components/HashFingerprint";
import RevealSequence from "../../../../components/RevealSequence";

// ─── Inline SVG Icons (no emojis) ──────────────────────────────────

function ChevronLeftIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="13 4 7 10 13 16" />
    </svg>
  );
}

function LockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
      <rect x="3" y="6" width="8" height="6" rx="1.5" />
      <path d="M5 6V4.5a2 2 0 014 0V6" />
    </svg>
  );
}

function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 1L2 3v3c0 2.5 1.7 4.5 4 5 2.3-.5 4-2.5 4-5V3L6 1z" />
    </svg>
  );
}

function CopyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="5" width="8" height="8" rx="1.5" />
      <path d="M3 11V3.5A1.5 1.5 0 014.5 2H11" />
    </svg>
  );
}

function SendIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2L7 9" />
      <path d="M14 2L9.5 14L7 9L2 6.5L14 2z" />
    </svg>
  );
}

function BulbIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
      <path d="M5.5 12h3M7 1.5A4 4 0 019.5 8.5V10h-5V8.5A4 4 0 017 1.5z" />
    </svg>
  );
}

// ─── Spinner ────────────────────────────────────────────────────────

function Spinner({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      className="animate-spin"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <circle cx="10" cy="10" r="8" strokeOpacity="0.25" />
      <path d="M10 2a8 8 0 016.93 4" strokeLinecap="round" />
    </svg>
  );
}

// ─── Page Loading ───────────────────────────────────────────────────

function PageSkeleton() {
  return (
    <div className="px-5 py-4 space-y-5">
      {/* Back button placeholder */}
      <div className="h-5 w-16 skeleton rounded" />

      {/* Confession card skeleton */}
      <div className="card p-5 space-y-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full skeleton" />
          <div className="h-3 w-32 skeleton rounded" />
        </div>
        <div className="space-y-2">
          <div className="h-4 w-full skeleton rounded" />
          <div className="h-4 w-4/5 skeleton rounded" />
          <div className="h-4 w-3/5 skeleton rounded" />
        </div>
        <div className="h-3 w-48 skeleton rounded" />
      </div>

      {/* Guess section skeleton */}
      <div className="card p-5 space-y-4">
        <div className="h-4 w-28 skeleton rounded" />
        <div className="flex justify-center gap-4">
          <div className="w-14 h-14 rounded-full skeleton" />
          <div className="w-14 h-14 rounded-full skeleton" />
          <div className="w-14 h-14 rounded-full skeleton" />
        </div>
        <div className="h-12 w-full skeleton rounded-xl" />
      </div>

      {/* Hints skeleton */}
      <div className="space-y-3">
        <div className="h-4 w-16 skeleton rounded" />
        <div className="h-16 w-full skeleton rounded-xl" />
        <div className="h-16 w-full skeleton rounded-xl" />
      </div>
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────

export default function ConfessionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { context } = useMiniKit();
  const { toast } = useToast();
  const { tap } = useHaptics();
  const [confession, setConfession] = useState<DbConfession | null>(null);
  const [hints, setHints] = useState<DbHint[]>([]);
  const [thread, setThread] = useState<DbThread[]>([]);
  const [loading, setLoading] = useState(true);

  const userFid = context?.user?.fid;

  // ─── Set Current FID for RLS ──────────────────────────────────
  useEffect(() => {
    if (userFid) {
      setCurrentFid(userFid);
    }
  }, [userFid]);

  // ─── Fetch Data ─────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    if (!id) return;
    setLoading(true);

    const [confRes, hintRes, threadRes] = await Promise.all([
      supabase.from("confessions").select("*").eq("id", id).single(),
      supabase
        .from("hints")
        .select("*")
        .eq("confession_id", id)
        .order("hint_level"),
      supabase
        .from("threads")
        .select("*")
        .eq("confession_id", id)
        .order("created_at"),
    ]);

    if (confRes.data) setConfession(confRes.data);
    if (hintRes.data) setHints(hintRes.data);
    if (threadRes.data) setThread(threadRes.data);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ─── Realtime Thread ────────────────────────────────────────────

  useEffect(() => {
    if (!id) return;
    const channel = supabase
      .channel(`thread:${id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "threads",
          filter: `confession_id=eq.${id}`,
        },
        (payload) => {
          setThread((prev) => [...prev, payload.new as DbThread]);
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  // ─── Copy Handler ───────────────────────────────────────────────

  const handleCopyLink = () => {
    if (typeof window === "undefined") return;
    copyToClipboard(window.location.href);
    tap();
    toast("Link copied!", "success");
  };

  // ─── Loading / Not Found ────────────────────────────────────────

  if (loading) return <PageSkeleton />;

  if (!confession) {
    return (
      <div className="px-5 py-4 space-y-4">
        <Link
          href="/app"
          className="inline-flex items-center gap-1 text-muted text-sm min-h-[48px]"
        >
          <ChevronLeftIcon />
          Back
        </Link>
        <div className="text-center py-16">
          <p className="text-lg font-display font-semibold mb-2">
            Not Found
          </p>
          <p className="text-sm text-dim">
            This confession may have been removed.
          </p>
        </div>
      </div>
    );
  }

  const isAnonymousLink = confession.is_anonymous_link;

  return (
    <div className="px-5 py-4 space-y-5">
      {/* ── Back Button (48px touch target) ──────────────────── */}
      <Link
        href="/app"
        className="inline-flex items-center gap-1 text-muted text-sm min-h-[48px] active:text-foreground transition-colors"
        style={{ WebkitTapHighlightColor: "transparent" }}
      >
        <ChevronLeftIcon />
        Back
      </Link>

      {/* ── Confession Card ──────────────────────────────────── */}
      <div className="card p-5 space-y-4 relative">
        <HashFingerprint id={confession.id} className="absolute top-3 right-3" />
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold ${
                isAnonymousLink
                  ? "bg-surface-elevated text-dim"
                  : "bg-accent-muted text-accent"
              }`}
            >
              {isAnonymousLink ? "?" : (
                <LockIcon className="text-accent" />
              )}
            </div>
            <div>
              <span className="text-sm font-medium text-foreground">
                {isAnonymousLink ? "Stranger" : "Anonymous"}
              </span>
              <span className="text-xs text-dim ml-2">
                {getTimeAgo(confession.created_at)}
              </span>
            </div>
          </div>
          {!isAnonymousLink && confession.platform && (
            <span className="text-[11px] px-2.5 py-1 rounded-full bg-accent-muted text-accent-soft font-medium">
              via {confession.platform}
            </span>
          )}
        </div>

        {/* Message */}
        <ConfessionQuote>
          <p className="text-lg text-foreground leading-relaxed confession-text">
            &ldquo;{confession.message}&rdquo;
          </p>
        </ConfessionQuote>

        {/* Encryption Badge */}
        {!isAnonymousLink && (
          <div className="flex items-center gap-1.5 text-dim">
            <ShieldIcon />
            <span className="text-[11px]">
              Sender identity encrypted with FHE on Base
            </span>
          </div>
        )}
      </div>

      {/* ── Guess Section ────────────────────────────────────── */}
      {!isAnonymousLink && (
        <GuessSection confessionId={id} onchainId={confession.onchain_id} onHintRefresh={fetchData} />
      )}

      {/* ── Hint Section ─────────────────────────────────────── */}
      {!isAnonymousLink && (
        <HintSection hints={hints} confessionId={id} onUnlock={fetchData} />
      )}

      {/* ── Thread Section ───────────────────────────────────── */}
      <ThreadSection thread={thread} confessionId={id} />

      {/* ── Share ────────────────────────────────────────────── */}
      <div className="pt-1">
        <button
          onClick={handleCopyLink}
          className="w-full card p-4 flex items-center justify-center gap-2 text-sm font-medium text-muted active:scale-[0.98] transition-transform min-h-[48px]"
          style={{ WebkitTapHighlightColor: "transparent" }}
        >
          <CopyIcon />
          Copy Link
        </button>
      </div>
    </div>
  );
}

// ─── Guess Section ──────────────────────────────────────────────────

function GuessSection({
  confessionId,
  onchainId,
  onHintRefresh: _onHintRefresh,
}: {
  confessionId: string;
  onchainId: number | null;
  onHintRefresh: () => void;
}) {
  const { toast } = useToast();
  const { tap, success: hapticSuccess, error: hapticError } = useHaptics();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();

  const [guessInput, setGuessInput] = useState("");
  const [guesses, setGuesses] = useState<
    Array<{ username: string; correct: boolean }>
  >([]);
  const [guessing, setGuessing] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [revealedUsername, setRevealedUsername] = useState("");
  const [_loadingGuesses, setLoadingGuesses] = useState(true);

  // ── Load existing guesses from server on mount ──────────────
  useEffect(() => {
    async function loadGuesses() {
      try {
        const res = await fetch(`/api/guesses/${confessionId}`);
        const data = await res.json();
        if (data.guesses?.length) {
          const loaded = data.guesses.map((g: { guess_fid: number; is_correct: boolean }) => ({
            username: `fid:${g.guess_fid}`,
            correct: g.is_correct,
          }));
          setGuesses(loaded);
          const correct = data.guesses.find((g: { is_correct: boolean }) => g.is_correct);
          if (correct) {
            setRevealed(true);
            setRevealedUsername(`fid:${correct.guess_fid}`);
          }
        }
      } catch {
        // Failed to load — start fresh
      }
      setLoadingGuesses(false);
    }
    loadGuesses();
  }, [confessionId]);

  const guessesRemaining = MAX_GUESSES - guesses.length;
  const allUsed = guessesRemaining <= 0;

  const handleGuess = async () => {
    const username = guessInput.trim().replace(/^@/, "");
    if (!username || guessing || allUsed) return;

    setGuessing(true);
    tap();

    let isCorrect = false;

    try {
      // Step 1: Resolve username to FID via Neynar
      const searchRes = await fetch(`/api/users/search?q=${encodeURIComponent(username)}`);
      const searchData = await searchRes.json();
      const guessedUser = searchData.users?.[0];

      if (!guessedUser) {
        toast("User not found. Check the username.", "error");
        setGuessing(false);
        setGuessInput("");
        return;
      }

      // Step 2: Try on-chain FHE guess (use actual onchain_id, not UUID)
      let usedOnchain = false;

      if (onchainId && onchainId > 0 && walletClient && publicClient) {
        try {
          // Encrypt the guessed FID with CoFHE
          const { cofhejs, Encryptable } = await import("cofhejs/web");
          const encryptResult = await cofhejs.encrypt([Encryptable.uint32(BigInt(guessedUser.fid))]);

          if (encryptResult?.success && encryptResult.data?.[0]) {
            // Submit encrypted guess to contract (FHE.eq comparison)
            const submitHash = await walletClient.writeContract({
              address: CONFESSION_VAULT_ADDRESS,
              abi: CONFESSION_VAULT_ABI,
              functionName: "submitGuess",
              args: [BigInt(onchainId), {
                ...encryptResult.data[0],
                signature: encryptResult.data[0].signature as `0x${string}`,
              }],
            });
            await publicClient.waitForTransactionReceipt({ hash: submitHash });

            // Poll resolveGuess until threshold network decrypts (~5-30s)
            let resolved = false;
            for (let attempt = 0; attempt < 30; attempt++) {
              await new Promise((r) => setTimeout(r, 2000));
              try {
                const resolveHash = await walletClient.writeContract({
                  address: CONFESSION_VAULT_ADDRESS,
                  abi: CONFESSION_VAULT_ABI,
                  functionName: "resolveGuess",
                  args: [BigInt(onchainId)],
                });
                const receipt = await publicClient.waitForTransactionReceipt({ hash: resolveHash });

                // Check GuessResolved event for the result
                const guessEvent = receipt.logs.find(log => log.topics.length > 0);
                if (guessEvent) {
                  // Read the confession meta to check if revealed
                  const meta = await publicClient.readContract({
                    address: CONFESSION_VAULT_ADDRESS,
                    abi: CONFESSION_VAULT_ABI,
                    functionName: "getConfessionMeta",
                    args: [BigInt(onchainId)],
                  });
                  // Destructure the tuple: [recipientId, messageRef, platform, timestamp, guessesUsed, revealed, ...]
                  const [
                    , , , , , metaRevealed,
                  ] = meta as [bigint, string, number, bigint, number, boolean, boolean, bigint, bigint, bigint];
                  isCorrect = metaRevealed;
                  resolved = true;
                  usedOnchain = true;
                  break;
                }
              } catch {
                // "Decryption not ready yet" — keep polling
                continue;
              }
            }

            if (!resolved) {
              toast("FHE decryption timed out. Try again.", "error");
            }
          }
        } catch (fheErr) {
          console.warn("On-chain guess failed:", fheErr);
        }
      }

      // Fallback: server-side guess verification for Supabase-only confessions
      if (!usedOnchain) {
        try {
          const { authFetch } = await import("../../../../lib/api");
          const guessRes = await authFetch(`/api/guesses/${confessionId}`, {
            method: "POST",
            body: JSON.stringify({ guessedFid: guessedUser.fid }),
          });
          const guessData = await guessRes.json();
          isCorrect = guessData.correct === true;
        } catch {
          // Server verification failed — treat as wrong
          isCorrect = false;
        }
      }

    } catch {
      toast("Something went wrong. Try again.", "error");
      setGuessing(false);
      setGuessInput("");
      return;
    }

    setGuesses((prev) => [...prev, { username, correct: isCorrect }]);

    if (isCorrect) {
      sound.reveal();
      setRevealedUsername(username);
      setRevealed(true);
      hapticSuccess();
      toast("Identity revealed!", "success");
    } else {
      sound.wrongGuess();
      hapticError();
      toast(
        guesses.length + 1 >= MAX_GUESSES
          ? "No guesses left. Try buying a hint."
          : "Wrong guess. Try again!",
        "error"
      );
    }

    setGuessInput("");
    setGuessing(false);
  };

  // ── Revealed State ────────────────────────────────────────────

  if (revealed) {
    return (
      <RevealSequence username={revealedUsername} guessCount={guesses.length} />
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="section-title text-lg">Who Said This?</h3>

      {/* ── Visual Guess Slots ──────────────────────────────── */}
      <div className="flex items-center justify-center gap-5 py-3">
        {Array.from({ length: MAX_GUESSES }).map((_, i) => {
          const guess = guesses[i];
          const isActive = i === guesses.length && !allUsed;

          return (
            <div key={i} className="flex flex-col items-center gap-2">
              <motion.div
                className={`w-14 h-14 rounded-full border-2 flex items-center justify-center transition-colors ${
                  guess
                    ? guess.correct
                      ? "border-neon bg-neon-muted"
                      : "border-danger bg-danger/10"
                    : isActive
                    ? "border-accent border-dashed"
                    : "border-border-subtle"
                }`}
                animate={
                  isActive
                    ? { borderColor: ["#8B5CF6", "#27272A", "#8B5CF6"] }
                    : {}
                }
                transition={
                  isActive
                    ? { duration: 2, repeat: Infinity, ease: "easeInOut" }
                    : {}
                }
              >
                {guess ? (
                  guess.correct ? (
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="4 10 8 14 16 6" />
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="#EF4444" strokeWidth="2.5" strokeLinecap="round">
                      <line x1="4" y1="4" x2="14" y2="14" />
                      <line x1="14" y1="4" x2="4" y2="14" />
                    </svg>
                  )
                ) : (
                  <span className="text-sm text-dim font-medium">
                    {i + 1}
                  </span>
                )}
              </motion.div>
              {guess && (
                <span className="text-[11px] text-dim truncate max-w-[60px]">
                  @{guess.username}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Decrypting State ──────────────────────────────── */}
      <AnimatePresence>
        {guessing && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="card p-4 flex items-center justify-center gap-3 overflow-hidden"
          >
            <Spinner size={18} />
            <span className="text-sm text-accent animate-pulse">
              Decrypting with FHE...
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Guess Input ──────────────────────────────────── */}
      {!allUsed ? (
        <div className="flex gap-2">
          <input
            value={guessInput}
            onChange={(e) => setGuessInput(e.target.value)}
            placeholder="@username"
            disabled={guessing}
            className="input flex-1"
            onKeyDown={(e) => e.key === "Enter" && handleGuess()}
          />
          <button
            onClick={handleGuess}
            disabled={!guessInput.trim() || guessing}
            className="btn btn-primary px-5 flex-shrink-0"
          >
            {guessing ? <Spinner size={16} /> : "Guess"}
          </button>
        </div>
      ) : (
        <div className="card p-4 text-center">
          <p className="text-sm text-danger font-medium mb-1">
            No guesses remaining
          </p>
          <p className="text-xs text-dim">
            Buy a hint below to learn more about the sender.
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Hint Section ───────────────────────────────────────────────────

function HintSection({
  hints,
  confessionId,
  onUnlock,
}: {
  hints: DbHint[];
  confessionId: string;
  onUnlock: () => void;
}) {
  const { toast } = useToast();
  const { tap, success: hapticSuccess } = useHaptics();
  const { buyHint, pending: contractPending } = useConfessionVault();
  const [buyingLevel, setBuyingLevel] = useState<number | null>(null);

  const hintLabels = [
    "First Letter",
    "Mutual Friends",
    "Activity Hint",
    "Narrowing Down",
    "Almost There",
  ];

  const handleBuyHint = async (level: number) => {
    if (contractPending || buyingLevel !== null) return;
    setBuyingLevel(level);
    tap();

    try {
      // Try on-chain payment first, fallback to API-only for Supabase confessions
      const onchainId = parseInt(confessionId, 10);
      if (!isNaN(onchainId) && onchainId > 0) {
        const txHash = await buyHint(onchainId);
        if (!txHash) {
          toast("Transaction failed. Try again.", "error");
          setBuyingLevel(null);
          return;
        }
      }

      // Generate the AI hint via NVIDIA NIM API (authenticated)
      const { authFetch } = await import("../../../../lib/api");
      const hintRes = await authFetch(`/api/hints/${confessionId}`, {
        method: "POST",
        body: JSON.stringify({ hintLevel: level }),
      });

      if (hintRes.ok) {
        hapticSuccess();
        toast("Hint unlocked!", "success");
        onUnlock(); // Triggers parent to refetch hints
      } else {
        toast("Failed to generate hint.", "error");
      }
    } catch {
      toast("Failed to unlock hint.", "error");
    }

    setBuyingLevel(null);
  };

  return (
    <div className="space-y-3">
      <h3 className="section-title text-lg">Hints</h3>

      <div className="space-y-2">
        {Array.from({ length: HINT_PRICES.length }).map((_, i) => {
          const level = i + 1;
          const hint = hints.find((h) => h.hint_level === level);
          const isUnlocked = !!hint;
          const isNextUnlock =
            !isUnlocked &&
            (i === 0 || hints.some((h) => h.hint_level === i));
          const isFutureLocked = !isUnlocked && !isNextUnlock;
          const isBuying = buyingLevel === level;
          const priceEth = HINT_PRICES[i];
          const priceLabel =
            priceEth < 0.001
              ? `${priceEth * 10000} x 10^-4 ETH`
              : `${priceEth} ETH`;

          return (
            <motion.div
              key={level}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.3,
                delay: i * 0.04,
                ease: [0.25, 0.46, 0.45, 0.94],
              }}
              className={`card p-4 transition-opacity ${
                isFutureLocked ? "opacity-40" : ""
              } ${isUnlocked ? "border-warm/20" : ""}`}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <BulbIcon
                    className={
                      isUnlocked
                        ? "text-warm"
                        : isNextUnlock
                        ? "text-muted"
                        : "text-dim"
                    }
                  />
                  <span
                    className={`text-sm font-medium ${
                      isUnlocked
                        ? "text-warm"
                        : isNextUnlock
                        ? "text-foreground"
                        : "text-dim"
                    }`}
                  >
                    Hint {level}
                  </span>
                  <span className="text-[11px] text-dim">
                    {hintLabels[i]}
                  </span>
                </div>
                {!isUnlocked && (
                  <span className="text-[11px] text-dim font-mono tabular-nums">
                    {priceLabel}
                  </span>
                )}
              </div>

              {isUnlocked ? (
                <p className="text-sm text-foreground mt-2 leading-relaxed">
                  {hint.hint_text}
                </p>
              ) : isNextUnlock ? (
                <button
                  onClick={() => handleBuyHint(level)}
                  disabled={isBuying || contractPending}
                  className="mt-2 w-full py-3 rounded-xl bg-accent-muted text-accent text-sm font-semibold min-h-[48px] transition-colors active:bg-accent/20 disabled:opacity-50"
                  style={{ WebkitTapHighlightColor: "transparent" }}
                >
                  {isBuying ? (
                    <span className="flex items-center justify-center gap-2">
                      <Spinner size={14} />
                      Unlocking...
                    </span>
                  ) : (
                    `Unlock for ${priceLabel}`
                  )}
                </button>
              ) : (
                <div className="flex items-center gap-1.5 mt-2 text-dim">
                  <LockIcon className="text-dim" />
                  <span className="text-[11px]">
                    Unlock previous hint first
                  </span>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Thread Section ─────────────────────────────────────────────────

function ThreadSection({
  thread,
  confessionId,
}: {
  thread: DbThread[];
  confessionId: string;
}) {
  const { toast } = useToast();
  const { tap } = useHaptics();
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to latest message
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [thread.length]);

  const handleReply = async () => {
    const text = reply.trim();
    if (!text || sending) return;
    setSending(true);
    tap();

    try {
      // Try authenticated request first, fall back to plain fetch
      let res: Response;
      try {
        const { authFetch } = await import("../../../../lib/api");
        res = await authFetch(`/api/threads/${confessionId}`, {
          method: "POST",
          body: JSON.stringify({
            senderRole: "recipient",
            message: text,
          }),
        });
      } catch {
        // authFetch import or call failed — use plain fetch
        res = await fetch(`/api/threads/${confessionId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            senderRole: "recipient",
            message: text,
          }),
        });
      }

      if (res.ok) {
        setReply("");
      } else {
        const errData = await res.json().catch(() => ({}));
        toast(errData.error || "Failed to send reply.", "error");
      }
    } catch {
      toast("Failed to send reply.", "error");
    }
    setSending(false);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="section-title text-lg">Thread</h3>
        {thread.length > 0 && (
          <span className="text-[11px] text-dim">
            {thread.length} {thread.length === 1 ? "message" : "messages"}
          </span>
        )}
      </div>

      {/* ── Messages ─────────────────────────────────────── */}
      {thread.length === 0 ? (
        <div className="card p-6 text-center">
          <p className="text-sm text-dim">
            No replies yet. Start the conversation.
          </p>
        </div>
      ) : (
        <div
          ref={scrollRef}
          className="space-y-2 max-h-[360px] overflow-y-auto"
          style={{ scrollbarWidth: "none" }}
        >
          <AnimatePresence initial={false}>
            {thread.map((msg) => {
              const isRecipient = msg.sender_role === "recipient";
              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 8, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.25 }}
                  className={`flex ${
                    isRecipient ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                      isRecipient
                        ? "bg-accent text-white rounded-br-md"
                        : "bg-surface border border-border-subtle rounded-bl-md"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`text-[11px] font-medium ${
                          isRecipient ? "text-white/70" : "text-dim"
                        }`}
                      >
                        {isRecipient ? "You" : "Them"}
                      </span>
                      <span
                        className={`text-[10px] ${
                          isRecipient ? "text-white/50" : "text-dim"
                        }`}
                      >
                        {getTimeAgo(msg.created_at)}
                      </span>
                    </div>
                    <p
                      className={`text-[15px] leading-relaxed ${
                        isRecipient ? "text-white" : "text-foreground"
                      }`}
                    >
                      {msg.message}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* ── Reply Input ──────────────────────────────────── */}
      <div className="flex gap-2">
        <input
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          placeholder="Reply anonymously..."
          disabled={sending}
          className="input flex-1"
          onKeyDown={(e) => e.key === "Enter" && handleReply()}
        />
        <button
          onClick={handleReply}
          disabled={!reply.trim() || sending}
          className="btn btn-primary px-4 flex-shrink-0"
          style={{ WebkitTapHighlightColor: "transparent" }}
        >
          {sending ? (
            <Spinner size={16} />
          ) : (
            <SendIcon />
          )}
        </button>
      </div>
    </div>
  );
}
