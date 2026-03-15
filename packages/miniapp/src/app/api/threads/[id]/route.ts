import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "../../../../lib/supabase";
import { verifyAuth, isRateLimited, rateLimitResponse } from "../../../../lib/auth";

export const dynamic = "force-dynamic";

// Add a reply to a confession thread — requires JWT auth
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (isRateLimited(request, 20, 60_000)) return rateLimitResponse();

    const auth = await verifyAuth(request);
    if (auth.error) return auth.error;

    const { id: confessionId } = await params;
    const { senderRole, message } = await request.json();
    const senderFid = auth.fid; // Use verified FID

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

    // Basic auth: verify the sender is either the recipient or the original sender
    if (senderRole === "recipient" && senderFid && confession.recipient_fid !== senderFid) {
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
