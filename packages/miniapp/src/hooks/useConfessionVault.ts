"use client";

import { useCallback, useState } from "react";
import { usePublicClient, useWalletClient } from "wagmi";
import { parseEther, keccak256, toBytes } from "viem";
import { CONFESSION_VAULT_ABI } from "../contracts/confessionVault";
import { CONFESSION_VAULT_ADDRESS, HINT_PRICES } from "../lib/constants";

// ─── Hook: useConfessionVault ─────────────────────────────────────
// Wraps all ConfessionVault contract interactions for the frontend.

export function useConfessionVault() {
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const [pending, setPending] = useState(false);

  // ─── Read Functions ────────────────────────────────────────────

  const getInbox = useCallback(
    async (recipientId: number): Promise<bigint[]> => {
      if (!publicClient) return [];
      try {
        const result = await publicClient.readContract({
          address: CONFESSION_VAULT_ADDRESS,
          abi: CONFESSION_VAULT_ABI,
          functionName: "getInbox",
          args: [BigInt(recipientId)],
        });
        return result as bigint[];
      } catch {
        return [];
      }
    },
    [publicClient]
  );

  const getConfessionMeta = useCallback(
    async (confessionId: number) => {
      if (!publicClient) return null;
      try {
        const result = await publicClient.readContract({
          address: CONFESSION_VAULT_ADDRESS,
          abi: CONFESSION_VAULT_ABI,
          functionName: "getConfessionMeta",
          args: [BigInt(confessionId)],
        });
        const [
          recipientId, messageRef, platform, timestamp,
          guessesUsed, revealed, isPublic,
          revealPrice, revealPool, blockPool,
        ] = result as [bigint, string, number, bigint, number, boolean, boolean, bigint, bigint, bigint];

        return {
          recipientId: Number(recipientId),
          messageRef,
          platform,
          timestamp: Number(timestamp),
          guessesUsed,
          revealed,
          isPublic,
          revealPrice,
          revealPool,
          blockPool,
        };
      } catch {
        return null;
      }
    },
    [publicClient]
  );

  const getHintLevel = useCallback(
    async (confessionId: number): Promise<number> => {
      if (!publicClient) return 0;
      try {
        const result = await publicClient.readContract({
          address: CONFESSION_VAULT_ADDRESS,
          abi: CONFESSION_VAULT_ABI,
          functionName: "getHintLevel",
          args: [BigInt(confessionId)],
        });
        return Number(result);
      } catch {
        return 0;
      }
    },
    [publicClient]
  );

  const getNextHintPrice = useCallback(
    async (confessionId: number): Promise<bigint> => {
      if (!publicClient) return BigInt(0);
      try {
        const result = await publicClient.readContract({
          address: CONFESSION_VAULT_ADDRESS,
          abi: CONFESSION_VAULT_ABI,
          functionName: "getNextHintPrice",
          args: [BigInt(confessionId)],
        });
        return result as bigint;
      } catch {
        return BigInt(0);
      }
    },
    [publicClient]
  );

  const isGuessPending = useCallback(
    async (confessionId: number): Promise<boolean> => {
      if (!publicClient) return false;
      try {
        const result = await publicClient.readContract({
          address: CONFESSION_VAULT_ADDRESS,
          abi: CONFESSION_VAULT_ABI,
          functionName: "isGuessPending",
          args: [BigInt(confessionId)],
        });
        return result as boolean;
      } catch {
        return false;
      }
    },
    [publicClient]
  );

  // ─── Write Functions ───────────────────────────────────────────

  const registerUser = useCallback(
    async (platformId: number, walletAddress?: `0x${string}`): Promise<string | null> => {
      if (!walletClient) return null;
      setPending(true);
      try {
        // V2: registerUser(platformId, wallet) — registrar only
        const wallet = walletAddress || walletClient.account.address;
        const hash = await walletClient.writeContract({
          address: CONFESSION_VAULT_ADDRESS,
          abi: CONFESSION_VAULT_ABI,
          functionName: "registerUser",
          args: [BigInt(platformId), wallet],
        });
        await publicClient?.waitForTransactionReceipt({ hash });
        return hash;
      } catch (err) {
        console.error("registerUser failed:", err);
        return null;
      } finally {
        setPending(false);
      }
    },
    [walletClient, publicClient]
  );

  const buyHint = useCallback(
    async (confessionId: number): Promise<string | null> => {
      if (!walletClient || !publicClient) return null;
      setPending(true);
      try {
        // Get the current hint price from contract
        const price = await getNextHintPrice(confessionId);
        if (price === BigInt(0)) return null;

        const hash = await walletClient.writeContract({
          address: CONFESSION_VAULT_ADDRESS,
          abi: CONFESSION_VAULT_ABI,
          functionName: "buyHint",
          args: [BigInt(confessionId)],
          value: price,
        });

        await publicClient.waitForTransactionReceipt({ hash });
        return hash;
      } catch (err) {
        console.error("buyHint failed:", err);
        return null;
      } finally {
        setPending(false);
      }
    },
    [walletClient, publicClient, getNextHintPrice]
  );

  const contributeToReveal = useCallback(
    async (confessionId: number, amountEth: string): Promise<string | null> => {
      if (!walletClient || !publicClient) return null;
      setPending(true);
      try {
        const hash = await walletClient.writeContract({
          address: CONFESSION_VAULT_ADDRESS,
          abi: CONFESSION_VAULT_ABI,
          functionName: "contributeToReveal",
          args: [BigInt(confessionId)],
          value: parseEther(amountEth),
        });

        await publicClient.waitForTransactionReceipt({ hash });
        return hash;
      } catch (err) {
        console.error("contributeToReveal failed:", err);
        return null;
      } finally {
        setPending(false);
      }
    },
    [walletClient, publicClient]
  );

  const blockReveal = useCallback(
    async (confessionId: number, amountEth: string): Promise<string | null> => {
      if (!walletClient || !publicClient) return null;
      setPending(true);
      try {
        const hash = await walletClient.writeContract({
          address: CONFESSION_VAULT_ADDRESS,
          abi: CONFESSION_VAULT_ABI,
          functionName: "blockReveal",
          args: [BigInt(confessionId)],
          value: parseEther(amountEth),
        });

        await publicClient.waitForTransactionReceipt({ hash });
        return hash;
      } catch (err) {
        console.error("blockReveal failed:", err);
        return null;
      } finally {
        setPending(false);
      }
    },
    [walletClient, publicClient]
  );

  // ─── Helper: Generate messageRef from text ─────────────────────

  const generateMessageRef = useCallback((messageText: string): `0x${string}` => {
    return keccak256(toBytes(messageText + Date.now().toString()));
  }, []);

  return {
    // Read
    getInbox,
    getConfessionMeta,
    getHintLevel,
    getNextHintPrice,
    isGuessPending,
    // Write
    registerUser,
    buyHint,
    contributeToReveal,
    blockReveal,
    // Utils
    generateMessageRef,
    pending,
    // Constants
    contractAddress: CONFESSION_VAULT_ADDRESS,
    hintPrices: HINT_PRICES,
  };
}
