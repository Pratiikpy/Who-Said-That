import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "../../../lib/supabase";
import { verifyAuth, isRateLimited, rateLimitResponse } from "../../../lib/auth";

export const dynamic = "force-dynamic";

// Toggle a reaction on a confession — requires JWT auth
export async function POST(request: NextRequest) {
  try {
    if (isRateLimited(request, 30, 60_000)) return rateLimitResponse();

    const auth = await verifyAuth(request);
    if (auth.error) return auth.error;

    const { confessionId, reactionType } = await request.json();
    const reactorFid = auth.fid; // Use verified FID

    if (!confessionId || !reactionType) {
      return NextResponse.json({ error: "Missing params" }, { status: 400 });
    }

    const validTypes = ["fire", "skull", "heart_eyes", "shock", "cap"];
    if (!validTypes.includes(reactionType)) {
      return NextResponse.json({ error: "Invalid reaction type" }, { status: 400 });
    }

    const supabase = createServerSupabase();

    // Check if already reacted
    const { data: existing } = await supabase
      .from("reactions")
      .select("id")
      .eq("confession_id", confessionId)
      .eq("reactor_fid", reactorFid)
      .eq("reaction_type", reactionType)
      .single();

    if (existing) {
      // Remove reaction (toggle off)
      await supabase.from("reactions").delete().eq("id", existing.id);
      return NextResponse.json({ action: "removed" });
    }

    // Add reaction
    await supabase.from("reactions").insert({
      confession_id: confessionId,
      reactor_fid: reactorFid,
      reaction_type: reactionType,
    });

    return NextResponse.json({ action: "added" });
  } catch (err) {
    console.error("Reaction error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

// Get reaction counts for a confession
export async function GET(request: NextRequest) {
  const confessionId = request.nextUrl.searchParams.get("confessionId");
  if (!confessionId) {
    return NextResponse.json({ error: "Missing confessionId" }, { status: 400 });
  }

  const supabase = createServerSupabase();

  const { data } = await supabase
    .from("reactions")
    .select("reaction_type")
    .eq("confession_id", confessionId);

  // Count by type
  const counts: Record<string, number> = {};
  (data || []).forEach((r) => {
    counts[r.reaction_type] = (counts[r.reaction_type] || 0) + 1;
  });

  return NextResponse.json({ counts });
}
