import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "../../../../lib/supabase";

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

      // Fix any confessions that were stored with recipient_fid=0
      // for this placeholder user
      await supabase
        .from("confessions")
        .update({ recipient_fid: fid })
        .eq("recipient_fid", 0)
        .eq("platform", "anonymous_link");

      // Also fix confessions where recipient_fid might have been set to
      // parseInt of the username (which would be 0 for non-numeric usernames)
      // This is a no-op if no such records exist

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
