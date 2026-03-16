import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "../../../../lib/supabase";
import { moderateContent } from "../../../../lib/nvidia";
import { sendNotification } from "../../../../lib/notifications";
import { isRateLimited, rateLimitResponse } from "../../../../lib/auth";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    // Rate limit: 5 anonymous confessions per minute per IP
    if (isRateLimited(request, 5, 60_000)) return rateLimitResponse();

    const { recipientUsername, message } = await request.json();

    if (!recipientUsername || !message?.trim()) {
      return NextResponse.json({ error: "Missing recipient or message" }, { status: 400 });
    }

    if (message.length > 500) {
      return NextResponse.json({ error: "Message too long (max 500 characters)" }, { status: 400 });
    }

    // Validate username format (alphanumeric, dots, hyphens, underscores, max 64 chars)
    if (!/^[\w.\-]{1,64}$/.test(recipientUsername)) {
      return NextResponse.json({ error: "Invalid username format" }, { status: 400 });
    }

    // AI moderation
    const modResult = await moderateContent(message);
    if (!modResult.safe) {
      return NextResponse.json(
        { error: modResult.reason || "Message blocked by community guidelines" },
        { status: 422 }
      );
    }

    const supabase = createServerSupabase();

    // Look up recipient
    const { data: recipient } = await supabase
      .from("users")
      .select("*")
      .or(`username.eq.${recipientUsername},share_slug.eq.${recipientUsername},platform_id.eq.${recipientUsername}`)
      .single();

    if (!recipient) {
      // If recipient not found, create a placeholder entry
      // This allows share links to work even before recipient signs up
      const { data: newUser, error: createErr } = await supabase
        .from("users")
        .insert({
          platform: "pending",
          platform_id: recipientUsername,
          username: recipientUsername,
          share_slug: recipientUsername,
        })
        .select()
        .single();

      if (createErr || !newUser) {
        return NextResponse.json({ error: "Recipient not found" }, { status: 404 });
      }

      // Store confession for the new placeholder user
      const { error } = await supabase.from("confessions").insert({
        recipient_fid: 0, // will be updated when user signs up
        message: message.trim(),
        platform: "anonymous_link",
        is_anonymous_link: true,
        is_public: false,
        moderation_status: "approved",
        moderation_score: modResult.score,
      });

      if (error) {
        console.error("Insert error:", error);
        return NextResponse.json({ error: "Failed to send" }, { status: 500 });
      }

      return NextResponse.json({ success: true });
    }

    // Resolve the recipient FID from platform_id.
    // If the user was synced from Farcaster, platform_id is their numeric FID as a string.
    // If the user is still a placeholder (created by a previous anon send before they
    // opened the app), platform_id might be a username string — parseInt returns NaN.
    const resolvedFid = parseInt(recipient.platform_id);
    const recipientFid = Number.isFinite(resolvedFid) && resolvedFid > 0
      ? resolvedFid
      : 0; // will be retroactively updated when user syncs via /api/users/sync

    // Store confession for existing user
    const { error } = await supabase.from("confessions").insert({
      recipient_fid: recipientFid,
      message: message.trim(),
      platform: "anonymous_link",
      is_anonymous_link: true,
      is_public: false,
      moderation_status: "approved",
      moderation_score: modResult.score,
    });

    if (error) {
      console.error("Insert error:", error);
      return NextResponse.json({ error: "Failed to send" }, { status: 500 });
    }

    // Send push notification to recipient (fire-and-forget)
    if (recipientFid > 0) {
      const appUrl =
        process.env.NEXT_PUBLIC_URL ||
        (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

      sendNotification(
        recipientFid,
        "New confession",
        "Someone sent you an anonymous confession",
        `${appUrl}/app`
      ).catch(() => {});
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Anonymous confession error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
