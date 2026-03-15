import { ImageResponse } from "@vercel/og";
import { NextRequest } from "next/server";
import { createServerSupabase } from "../../../../lib/supabase";

export const dynamic = "force-dynamic";

// Characters used for the cipher rows at the top of the card
const CIPHER_CHARS =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$%&";

/**
 * Generate a deterministic pseudo-random cipher string from an ID seed.
 * Falls back to Math.random if no seed provided.
 */
function generateCipherRow(length: number, seed: number): string {
  let s = seed;
  const chars: string[] = [];
  for (let i = 0; i < length; i++) {
    // Simple LCG for deterministic randomness
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    chars.push(CIPHER_CHARS[s % CIPHER_CHARS.length]);
  }
  return chars.join("  "); // double-spaced for even distribution
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  let confessionText = "Someone sent an anonymous confession...";
  let recipientName = "someone";

  try {
    const supabase = createServerSupabase();
    const { data } = await supabase
      .from("confessions")
      .select("message, recipient_fid")
      .eq("id", id)
      .single();

    if (data) {
      confessionText =
        data.message.length > 160
          ? data.message.slice(0, 160) + "..."
          : data.message;

      const { data: user } = await supabase
        .from("users")
        .select("username")
        .eq("platform_id", String(data.recipient_fid))
        .single();

      if (user) recipientName = user.username;
    }
  } catch {
    // Use defaults
  }

  // Derive a numeric seed from the ID for cipher rows
  const idSeed = id
    .replace(/-/g, "")
    .split("")
    .reduce((acc, ch) => (acc * 31 + ch.charCodeAt(0)) | 0, 0);

  const cipherRow1 = generateCipherRow(60, idSeed);
  const cipherRow2 = generateCipherRow(60, idSeed + 7919);

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200",
          height: "630",
          display: "flex",
          flexDirection: "column",
          background: "#09090B",
          fontFamily: "system-ui, sans-serif",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* ── Top: Cipher rows ──────────────────────────────── */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "6px",
            padding: "24px 48px 0 48px",
          }}
        >
          <span
            style={{
              fontFamily: "monospace, 'Courier New'",
              fontSize: "13px",
              color: "rgba(139, 92, 246, 0.08)",
              letterSpacing: "0.04em",
              whiteSpace: "nowrap",
              overflow: "hidden",
            }}
          >
            {cipherRow1}
          </span>
          <span
            style={{
              fontFamily: "monospace, 'Courier New'",
              fontSize: "13px",
              color: "rgba(139, 92, 246, 0.08)",
              letterSpacing: "0.04em",
              whiteSpace: "nowrap",
              overflow: "hidden",
            }}
          >
            {cipherRow2}
          </span>
        </div>

        {/* ── Main content area ─────────────────────────────── */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: "20px 64px 40px 64px",
            flex: 1,
            position: "relative",
          }}
        >
          {/* Top-left: App logo */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "14px",
              marginBottom: "8px",
            }}
          >
            <div
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "12px",
                background: "#8B5CF6",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "22px",
                color: "white",
                fontWeight: 700,
              }}
            >
              ?
            </div>
          </div>

          {/* Large decorative opening quote */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              flex: 1,
              justifyContent: "center",
              position: "relative",
            }}
          >
            <span
              style={{
                position: "absolute",
                top: "-20px",
                left: "-8px",
                fontFamily: "Georgia, 'Times New Roman', Literata, serif",
                fontSize: "120px",
                lineHeight: "1",
                color: "rgba(139, 92, 246, 0.08)",
              }}
            >
              {"\u201C"}
            </span>

            {/* Confession text */}
            <p
              style={{
                color: "#FFFFFF",
                fontSize: "32px",
                fontStyle: "italic",
                fontWeight: 300,
                lineHeight: 1.5,
                maxWidth: "960px",
                letterSpacing: "-0.01em",
                paddingLeft: "8px",
              }}
            >
              {confessionText}
            </p>
          </div>

          {/* ── Divider ───────────────────────────────────── */}
          <div
            style={{
              width: "100%",
              height: "1px",
              background: "rgba(255, 255, 255, 0.06)",
              marginTop: "16px",
              marginBottom: "20px",
            }}
          />

          {/* ── Footer row ─────────────────────────────────── */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-end",
              width: "100%",
            }}
          >
            {/* Bottom left: Recipient */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "4px",
              }}
            >
              <span
                style={{
                  color: "#71717A",
                  fontSize: "12px",
                  fontWeight: 500,
                  textTransform: "uppercase" as const,
                  letterSpacing: "0.06em",
                }}
              >
                SENT ANONYMOUSLY TO
              </span>
              <span
                style={{
                  color: "#FFFFFF",
                  fontSize: "18px",
                  fontWeight: 700,
                }}
              >
                @{recipientName}
              </span>
            </div>

            {/* Bottom right: FHE badge + domain */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "16px",
              }}
            >
              {/* FHE ENCRYPTED pill */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "6px 14px",
                  borderRadius: "100px",
                  background: "#8B5CF6",
                  color: "#FFFFFF",
                  fontSize: "12px",
                  fontWeight: 700,
                  letterSpacing: "0.04em",
                  textTransform: "uppercase" as const,
                }}
              >
                FHE ENCRYPTED
              </div>

              {/* Domain */}
              <span
                style={{
                  color: "#06FFA5",
                  fontSize: "15px",
                  fontWeight: 600,
                }}
              >
                whosaidthat.xyz
              </span>
            </div>
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
