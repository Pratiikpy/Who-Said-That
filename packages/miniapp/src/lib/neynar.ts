// ─── Neynar API Integration (Farcaster Social Graph) ──────────────

const NEYNAR_API_URL = "https://api.neynar.com/v2";

function getApiKey(): string {
  const key = process.env.NEYNAR_API_KEY;
  if (!key) throw new Error("NEYNAR_API_KEY not set — add it to .env.local (server-only, no NEXT_PUBLIC_ prefix)");
  return key;
}

export interface FarcasterUser {
  fid: number;
  username: string;
  display_name: string;
  pfp_url: string;
  follower_count: number;
  following_count: number;
}

// Search Farcaster users by username query
export async function searchUsers(query: string, limit = 10): Promise<FarcasterUser[]> {
  if (!query || query.length < 2) return [];

  try {
    const res = await fetch(
      `${NEYNAR_API_URL}/farcaster/user/search?q=${encodeURIComponent(query)}&limit=${limit}`,
      {
        headers: {
          accept: "application/json",
          "x-api-key": getApiKey(),
        },
      }
    );

    if (!res.ok) return [];

    const data = await res.json();
    return (data.result?.users || []).map((u: Record<string, unknown>) => ({
      fid: u.fid as number,
      username: u.username as string,
      display_name: u.display_name as string || u.username as string,
      pfp_url: u.pfp_url as string || "",
      follower_count: u.follower_count as number || 0,
      following_count: u.following_count as number || 0,
    }));
  } catch {
    return [];
  }
}

// Get a single user by FID
export async function getUserByFid(fid: number): Promise<FarcasterUser | null> {
  try {
    const res = await fetch(
      `${NEYNAR_API_URL}/farcaster/user/bulk?fids=${fid}`,
      {
        headers: {
          accept: "application/json",
          "x-api-key": getApiKey(),
        },
      }
    );

    if (!res.ok) return null;

    const data = await res.json();
    const u = data.users?.[0];
    if (!u) return null;

    return {
      fid: u.fid,
      username: u.username,
      display_name: u.display_name || u.username,
      pfp_url: u.pfp_url || "",
      follower_count: u.follower_count || 0,
      following_count: u.following_count || 0,
    };
  } catch {
    return null;
  }
}

// Get mutual followers between two FIDs
export async function getMutuals(fid: number, viewerFid: number): Promise<FarcasterUser[]> {
  try {
    const res = await fetch(
      `${NEYNAR_API_URL}/farcaster/followers?target_fid=${fid}&viewer_fid=${viewerFid}&limit=100`,
      {
        headers: {
          accept: "application/json",
          "x-api-key": getApiKey(),
        },
      }
    );

    if (!res.ok) return [];

    const data = await res.json();
    return (data.users || [])
      .filter((u: Record<string, unknown>) => u.viewer_context && (u.viewer_context as Record<string, boolean>).following)
      .map((u: Record<string, unknown>) => ({
        fid: u.fid as number,
        username: u.username as string,
        display_name: u.display_name as string || u.username as string,
        pfp_url: u.pfp_url as string || "",
        follower_count: u.follower_count as number || 0,
        following_count: u.following_count as number || 0,
      }));
  } catch {
    return [];
  }
}
