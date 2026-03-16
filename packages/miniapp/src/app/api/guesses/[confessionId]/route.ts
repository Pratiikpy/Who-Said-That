import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "../../../../lib/supabase";
import { verifyAuth, isRateLimited, rateLimitResponse } from "../../../../lib/auth";
import { MAX_GUESSES } from "../../../../lib/constants";

export const dynamic = "force-dynamic";

/**
 * POST /api/guesses/[confessionId]
 *
 * Server-side guess verification for Supabase-only confessions (no on-chain ID).
 * Compares the guessed FID against the stored sender_fid.
 * Persists the guess to the guesses table.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ confessionId: string }> }
) {
  try {
    if (isRateLimited(request, 10, 60_000)) return rateLimitResponse();

    // Require authentication
    const auth = await verifyAuth(request);
    const guesserFid = auth.error ? null : auth.fid;

    const { confessionId } = await params;
    const { guessedFid } = await request.json();

    if (!confessionId || !guessedFid) {
      return NextResponse.json(
        { error: "confessionId and guessedFid are required" },
        { status: 400 }
      );
    }

    const supabase = createServerSupabase();

    // Fetch the confession to get sender_fid
    const { data: confession } = await supabase
      .from("confessions")
      .select("sender_fid, recipient_fid")
      .eq("id", confessionId)
      .single();

    if (!confession) {
      return NextResponse.json(
        { error: "Confession not found" },
        { status: 404 }
      );
    }

    // Check how many guesses have been made for this confession
    const { count: existingGuesses } = await supabase
      .from("guesses")
      .select("*", { count: "exact", head: true })
      .eq("confession_id", confessionId);

    if ((existingGuesses || 0) >= MAX_GUESSES) {
      return NextResponse.json(
        { error: "No guesses remaining", correct: false },
        { status: 400 }
      );
    }

    // Compare guessed FID against sender FID
    const isCorrect =
      confession.sender_fid !== null &&
      confession.sender_fid === guessedFid;

    // Persist the guess
    await supabase.from("guesses").insert({
      confession_id: confessionId,
      guesser_fid: guesserFid || 0,
      guess_fid: guessedFid,
      is_correct: isCorrect,
    });

    return NextResponse.json({
      correct: isCorrect,
      guessesRemaining: MAX_GUESSES - (existingGuesses || 0) - 1,
    });
  } catch (err) {
    console.error("Guess error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/guesses/[confessionId]
 *
 * Retrieve all guesses for a confession (for restoring state on page reload).
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ confessionId: string }> }
) {
  const { confessionId } = await params;

  const supabase = createServerSupabase();
  const { data } = await supabase
    .from("guesses")
    .select("*")
    .eq("confession_id", confessionId)
    .order("created_at");

  return NextResponse.json({ guesses: data || [] });
}
