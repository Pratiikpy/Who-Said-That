import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const NEYNAR_API_URL = "https://api.neynar.com/v2";

function getApiKey(): string {
  return process.env.NEYNAR_API_KEY || "";
}

// Search by exact username (free Neynar endpoint)
// Falls back to username lookup since search requires paid plan
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q");
  if (!q || q.length < 2) {
    return NextResponse.json({ users: [] });
  }

  const apiKey = getApiKey();
  if (!apiKey) {
    return NextResponse.json({ users: [] });
  }

  try {
    // Try exact username lookup first (free)
    const res = await fetch(
      `${NEYNAR_API_URL}/farcaster/user/by_username?username=${encodeURIComponent(q)}`,
      {
        headers: {
          accept: "application/json",
          "x-api-key": apiKey,
        },
      }
    );

    if (res.ok) {
      const data = await res.json();
      const u = data.user;
      if (u) {
        return NextResponse.json({
          users: [
            {
              fid: u.fid,
              username: u.username,
              display_name: u.display_name || u.username,
              pfp_url: u.pfp_url || "",
              follower_count: u.follower_count || 0,
              following_count: u.following_count || 0,
            },
          ],
        });
      }
    }

    // If exact match fails, try search (paid — will return empty on free plan)
    const searchRes = await fetch(
      `${NEYNAR_API_URL}/farcaster/user/search?q=${encodeURIComponent(q)}&limit=8`,
      {
        headers: {
          accept: "application/json",
          "x-api-key": apiKey,
        },
      }
    );

    if (searchRes.ok) {
      const searchData = await searchRes.json();
      const users = (searchData.result?.users || []).map(
        (u: Record<string, unknown>) => ({
          fid: u.fid,
          username: u.username,
          display_name: (u.display_name as string) || (u.username as string),
          pfp_url: (u.pfp_url as string) || "",
          follower_count: (u.follower_count as number) || 0,
          following_count: (u.following_count as number) || 0,
        })
      );
      return NextResponse.json({ users });
    }

    return NextResponse.json({ users: [] });
  } catch {
    return NextResponse.json({ users: [] });
  }
}
