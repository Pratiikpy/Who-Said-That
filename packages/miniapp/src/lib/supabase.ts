import { createClient, SupabaseClient } from "@supabase/supabase-js";

// ─── Lazy-initialized Supabase clients ──────────────────────────────
// Uses getter function instead of Proxy to preserve type safety and method binding

let _supabase: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!_supabase) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) {
      throw new Error("NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set");
    }
    _supabase = createClient(url, key);
  }
  return _supabase;
}

// For backwards compat — pages that import `supabase` directly
// Kept as a getter-based export so it's still importable as a value
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop: string) {
    const client = getSupabase();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const value = (client as any)[prop];
    if (typeof value === "function") {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
      return (value as (...args: unknown[]) => unknown).bind(client);
    }
    return value;
  },
});

// Server-side client with service role key (API routes only)
export function createServerSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Supabase URL and service role key must be set for server operations");
  }
  return createClient(url, key);
}

// ─── RLS Helper ──────────────────────────────────────────────────────
// Call this once per session (or when fid changes) so that RLS policies
// can scope rows to the current Farcaster user.
// Usage: await setCurrentFid(context.user.fid);

let _lastFidSet: number | null = null;

export async function setCurrentFid(fid: number): Promise<void> {
  if (_lastFidSet === fid) return; // skip if already set
  const client = getSupabase();
  await client.rpc("set_current_fid", { fid });
  _lastFidSet = fid;
}

// ─── Types ───────────────────────────────────────────────────────────

export interface DbUser {
  id: string;
  platform: string;
  platform_id: string;
  username: string;
  display_name: string | null;
  pfp_url: string | null;
  wallet_address: string | null;
  share_slug: string;
  created_at: string;
}

export interface DbConfession {
  id: string;
  onchain_id: number | null;
  sender_fid: number | null;
  recipient_fid: number;
  message: string;
  platform: string;
  is_anonymous_link: boolean;
  is_public: boolean;
  sender_hint_data: Record<string, unknown> | null;
  moderation_status: string;
  created_at: string;
}

export interface DbGuess {
  id: string;
  confession_id: string;
  guesser_fid: number;
  guess_fid: number;
  is_correct: boolean;
  tx_hash: string | null;
  created_at: string;
}

export interface DbHint {
  id: string;
  confession_id: string;
  buyer_fid: number;
  hint_level: number;
  hint_text: string;
  created_at: string;
}

export interface DbThread {
  id: string;
  confession_id: string;
  sender_role: "sender" | "recipient";
  message: string;
  created_at: string;
}
