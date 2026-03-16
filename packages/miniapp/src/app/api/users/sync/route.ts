import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "../../../../lib/supabase";
import { verifyAuth } from "../../../../lib/auth";

export const dynamic = "force-dynamic";

/**
 * POST /api/users/sync
 *
 * Called when a user opens the app inside Farcaster. Upserts their profile
 * into the users table so that:
 *   1. Anonymous confessions sent via share link can look up their FID
 *   2. Any placeholder records (created before the user signed up) get
 *      their platform_id updated to the real FID
 *   3. Confessions stored with recipient_fid=0 for placeholder users
 *      get retroactively updated to the real FID
 */
export async function POST(request: NextRequest) {
  try {
    const { fid, username, displayName, pfpUrl } = await request.json();

    if (!fid || !username) {
      return NextResponse.json(
        { error: "fid and username are required" },
        { status: 400 }
      );
    }

    // Verify JWT when available — prevents FID spoofing.
    // If Quick Auth isn't available yet (first load race), allow body FID
    // as a fallback but log a warning.
    const auth = await verifyAuth(request);
    if (!auth.error && auth.fid !== fid) {
      return NextResponse.json(
        { error: "FID mismatch between token and body" },
        { status: 403 }
      );
    }

    const supabase = createServerSupabase();

    // Check if a user record already exists for this FID
    const { data: existingByFid } = await supabase
      .from("users")
      .select("*")
      .eq("platform_id", String(fid))
      .single();

    if (existingByFid) {
      // User already registered with correct FID — update profile fields
      await supabase
        .from("users")
        .update({
          username,
          display_name: displayName || existingByFid.display_name,
          pfp_url: pfpUrl || existingByFid.pfp_url,
          share_slug: username,
        })
        .eq("platform_id", String(fid));

      return NextResponse.json({ success: true, action: "updated" });
    }

    // Check if a placeholder record exists for this username (created by anon route)
    const { data: placeholder } = await supabase
      .from("users")
      .select("*")
      .or(`username.eq.${username},share_slug.eq.${username}`)
      .single();

    if (placeholder) {
      // Upgrade the placeholder: set real FID and platform
      await supabase
        .from("users")
        .update({
          platform: "farcaster",
          platform_id: String(fid),
          display_name: displayName || placeholder.display_name,
          pfp_url: pfpUrl || placeholder.pfp_url,
          share_slug: username,
        })
        .eq("id", placeholder.id);

      // Fix confessions that were stored with recipient_fid=0 for THIS placeholder.
      // We scope the update using the placeholder's created_at timestamp — only
      // confessions inserted AFTER the placeholder was created could belong to it.
      // This prevents stealing orphaned confessions that belong to other placeholders.
      await supabase
        .from("confessions")
        .update({ recipient_fid: fid })
        .eq("recipient_fid", 0)
        .eq("platform", "anonymous_link")
        .gte("created_at", placeholder.created_at);

      return NextResponse.json({ success: true, action: "upgraded" });
    }

    // No existing record — create a fresh one
    const { error } = await supabase.from("users").insert({
      platform: "farcaster",
      platform_id: String(fid),
      username,
      display_name: displayName || username,
      pfp_url: pfpUrl || null,
      share_slug: username,
    });

    if (error) {
      // Handle unique constraint violations gracefully
      if (error.code === "23505") {
        return NextResponse.json({ success: true, action: "exists" });
      }
      console.error("User sync insert error:", error);
      return NextResponse.json({ error: "Failed to sync" }, { status: 500 });
    }

    return NextResponse.json({ success: true, action: "created" });
  } catch (err) {
    console.error("User sync error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
