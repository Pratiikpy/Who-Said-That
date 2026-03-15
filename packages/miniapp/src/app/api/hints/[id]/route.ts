import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "../../../../lib/supabase";
import { generateHint } from "../../../../lib/nvidia";
import { verifyAuth, isRateLimited, rateLimitResponse } from "../../../../lib/auth";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Rate limit: 5 hint requests per minute
    if (isRateLimited(request, 5, 60_000)) return rateLimitResponse();

    // Require authentication
    const auth = await verifyAuth(request);
    if (auth.error) return auth.error;

    const { id: confessionId } = await params;
    const { hintLevel, txHash: _txHash } = await request.json();
    const buyerFid = auth.fid; // Use verified FID, not client-supplied

    if (!confessionId || !hintLevel || !buyerFid) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
    }

    if (hintLevel < 1 || hintLevel > 5) {
      return NextResponse.json({ error: "Invalid hint level (1-5)" }, { status: 400 });
    }

    const supabase = createServerSupabase();

    // Check if hint already exists (don't regenerate)
    const { data: existingHint } = await supabase
      .from("hints")
      .select("*")
      .eq("confession_id", confessionId)
      .eq("hint_level", hintLevel)
      .single();

    if (existingHint) {
      return NextResponse.json({ hint: existingHint });
    }

    // Get confession + sender hint data
    const { data: confession } = await supabase
      .from("confessions")
      .select("*")
      .eq("id", confessionId)
      .single();

    if (!confession) {
      return NextResponse.json({ error: "Confession not found" }, { status: 404 });
    }

    // Generate hint via NVIDIA NIM
    const hintData = confession.sender_hint_data || {
      follower_range: "unknown",
      account_age_months: "unknown",
      mutual_count: 0,
      recent_interactions: 0,
      platform: confession.platform || "farcaster",
    };

    const hintText = await generateHint(hintLevel, hintData);

    // Store hint
    const { data: hint, error } = await supabase
      .from("hints")
      .insert({
        confession_id: confessionId,
        buyer_fid: buyerFid,
        hint_level: hintLevel,
        hint_text: hintText,
      })
      .select()
      .single();

    if (error) {
      console.error("Hint insert error:", error);
      return NextResponse.json({ error: "Failed to store hint" }, { status: 500 });
    }

    return NextResponse.json({ hint });
  } catch (err) {
    console.error("Hint generation error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
