import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "../../../../lib/supabase";
import { verifyAuth, isRateLimited, rateLimitResponse } from "../../../../lib/auth";
import { sendNotification } from "../../../../lib/notifications";

export const dynamic = "force-dynamic";

// Add a reply to a confession thread
// Auth is optional: authenticated users get FID-verified, unauthenticated
// users can still reply (rate-limited by IP).
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (isRateLimited(request, 20, 60_000)) return rateLimitResponse();

    // Try auth — but don't block if it fails (Quick Auth isn't available everywhere)
    const auth = await verifyAuth(request);
    const senderFid = auth.fid; // null if auth failed

    const { id: confessionId } = await params;
    const { senderRole, message } = await request.json();

    if (!message?.trim()) {
      return NextResponse.json({ error: "Message required" }, { status: 400 });
    }

    if (!["sender", "recipient"].includes(senderRole)) {
      return NextResponse.json({ error: "Invalid sender role" }, { status: 400 });
    }

    if (message.length > 500) {
      return NextResponse.json({ error: "Message too long" }, { status: 400 });
    }

    const supabase = createServerSupabase();

    // Verify the confession exists
    const { data: confession } = await supabase
      .from("confessions")
      .select("recipient_fid, sender_fid")
      .eq("id", confessionId)
      .single();

    if (!confession) {
      return NextResponse.json({ error: "Confession not found" }, { status: 404 });
    }

    // Authorization: only enforce FID check when auth succeeded AND
    // recipient_fid is actually set (non-zero). Share link confessions
    // often have recipient_fid=0 until the user syncs.
    if (
      senderRole === "recipient" &&
      senderFid &&
      confession.recipient_fid > 0 &&
      confession.recipient_fid !== senderFid
    ) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    const { data: reply, error } = await supabase
      .from("threads")
      .insert({
        confession_id: confessionId,
        sender_role: senderRole,
        message: message.trim(),
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: "Failed to send reply" }, { status: 500 });
    }

    // Notify the other party (fire-and-forget)
    const appUrl =
      process.env.NEXT_PUBLIC_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

    if (senderRole === "sender" && confession.recipient_fid > 0) {
      // Sender replied → notify the recipient
      sendNotification(
        confession.recipient_fid,
        "New reply",
        "The anonymous sender replied to your thread",
        `${appUrl}/app/c/${confessionId}`
      ).catch(() => {});
    } else if (senderRole === "recipient" && confession.sender_fid) {
      // Recipient replied → notify the sender (if known)
      sendNotification(
        confession.sender_fid,
        "New reply",
        "Someone replied to your confession",
        `${appUrl}/app/c/${confessionId}`
      ).catch(() => {});
    }

    return NextResponse.json({ reply });
  } catch (err) {
    console.error("Thread reply error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

// Get thread messages for a confession
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: confessionId } = await params;

  const supabase = createServerSupabase();
  const { data } = await supabase
    .from("threads")
    .select("*")
    .eq("confession_id", confessionId)
    .order("created_at");

  return NextResponse.json({ threads: data || [] });
}
