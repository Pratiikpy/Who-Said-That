import { baseSepolia } from "wagmi/chains";

export const APP_NAME = "Who Said That";
export const APP_DESCRIPTION = "Anonymous encrypted confessions on Base";

export const CHAIN = baseSepolia;
export const CHAIN_ID = 84532;

// Contract address — deployed to Base Sepolia
export const CONFESSION_VAULT_ADDRESS: `0x${string}` =
  (process.env.NEXT_PUBLIC_COFHE_CONTRACT_ADDRESS as `0x${string}`) ||
  "0x6AA8ef4717211508286BB1E208372288c55934C4";

// Hint pricing (must match contract)
export const HINT_PRICES = [
  0.0001, // Level 1
  0.0005, // Level 2
  0.001, // Level 3
  0.002, // Level 4
  0.005, // Level 5
] as const;

export const MAX_GUESSES = 3;
export const MAX_CONFESSION_LENGTH = 500;
export const MAX_HINTS = 5;

// Reaction types
export const REACTION_TYPES = [
  { type: "fire", emoji: "\uD83D\uDD25", label: "Fire" },
  { type: "skull", emoji: "\uD83D\uDC80", label: "Dead" },
  { type: "heart_eyes", emoji: "\uD83D\uDE0D", label: "Love" },
  { type: "shock", emoji: "\uD83D\uDE31", label: "Shock" },
  { type: "cap", emoji: "\uD83E\uDDE2", label: "Cap" },
] as const;

// Platforms
export const PLATFORMS = {
  FARCASTER: 0,
  GOOGLE: 1,
  WALLET: 2,
} as const;

// Neynar API
export const NEYNAR_API_URL = "https://api.neynar.com/v2";
