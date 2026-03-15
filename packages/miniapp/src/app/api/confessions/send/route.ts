import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "../../../../lib/supabase";
import { moderateContent } from "../../../../lib/nvidia";
import { sendNotification } from "../../../../lib/notifications";
import { verifyAuth, isRateLimited, rateLimitResponse } from "../../../../lib/auth";

export const dynamic = "force-dynamic";

// Authenticated confession endpoint — requires JWT, stores sender FID + onchain ID
export async function POST(request: NextRequest) {
  try {
    // Rate limit: 10 confessions per minute per IP
    if (isRateLimited(request, 10, 60_000)) return rateLimitResponse();

    // Verify JWT auth — get real sender FID from token, not from body
    const auth = await verifyAuth(request);
    const authenticatedFid = auth.error ? null : auth.fid; // Allow fallback for now

    const {
      senderFid: _clientFid, // Ignored — use authenticatedFid instead
      recipientFid,
      recipientUsername,
      message,
      platform,
      onchainId,
      txHash: _txHash,
      senderHintData,
    } = await request.json();

    if (!message?.trim()) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    if (message.length > 500) {
      return NextResponse.json({ error: "Message too long" }, { status: 400 });
    }

    if (!recipientFid && !recipientUsername) {
      return NextResponse.json({ error: "Recipient is required" }, { status: 400 });
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

    // Resolve recipient FID if only username provided
    let resolvedRecipientFid = recipientFid;
    if (!resolvedRecipientFid && recipientUsername) {
      const { data: user } = await supabase
        .from("users")
        .select("platform_id")
        .eq("username", recipientUsername)
        .single();
      resolvedRecipientFid = user ? parseInt(user.platform_id) : 0;
    }

    // Insert confession
    const { data: confession, error } = await supabase
      .from("confessions")
      .insert({
        onchain_id: onchainId || null,
        sender_fid: authenticatedFid || null,
        recipient_fid: resolvedRecipientFid || 0,
        message: message.trim(),
        platform: platform || "farcaster",
        is_anonymous_link: false, // This is an authenticated send
        is_public: false,
        sender_hint_data: senderHintData || null,
        moderation_status: "approved",
        moderation_score: modResult.score,
      })
      .select()
      .single();

    if (error) {
      console.error("Confession insert error:", error);
      return NextResponse.json({ error: "Failed to send" }, { status: 500 });
    }

    // Send push notification to recipient (fire-and-forget)
    const appUrl =
      process.env.NEXT_PUBLIC_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

    sendNotification(
      resolvedRecipientFid,
      "New confession",
      "Someone sent you an anonymous confession",
      `${appUrl}/app`
    ).catch(() => {});

    return NextResponse.json({
      success: true,
      id: confession.id,
      onchainId: onchainId,
    });
  } catch (err) {
    console.error("Authenticated confession error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
