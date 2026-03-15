import { ImageResponse } from "@vercel/og";
import { NextRequest } from "next/server";
import { createServerSupabase } from "../../../../lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  let confessionText = "Someone sent an anonymous confession...";
  let recipientName = "someone";
  let confessionCount = 0;

  try {
    const supabase = createServerSupabase();
    const { data } = await supabase
      .from("confessions")
      .select("message, recipient_fid")
      .eq("id", id)
      .single();

    if (data) {
      confessionText = data.message.length > 160
        ? data.message.slice(0, 160) + "..."
        : data.message;

      const { data: user } = await supabase
        .from("users")
        .select("username")
        .eq("platform_id", String(data.recipient_fid))
        .single();

      if (user) recipientName = user.username;

      const { count } = await supabase
        .from("confessions")
        .select("*", { count: "exact", head: true })
        .eq("recipient_fid", data.recipient_fid);

      confessionCount = count || 0;
    }
  } catch {
    // Use defaults
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200",
          height: "630",
          display: "flex",
          background: "#09090B",
          fontFamily: "system-ui, sans-serif",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Ambient gradient */}
        <div
          style={{
            position: "absolute",
            top: "-100px",
            left: "200px",
            width: "400px",
            height: "400px",
            borderRadius: "50%",
            background: "rgba(139, 92, 246, 0.08)",
            filter: "blur(100px)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "-50px",
            right: "100px",
            width: "300px",
            height: "300px",
            borderRadius: "50%",
            background: "rgba(34, 197, 94, 0.05)",
            filter: "blur(80px)",
          }}
        />

        {/* Content */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: "56px 64px",
            width: "100%",
            position: "relative",
            zIndex: 1,
          }}
        >
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
              <div
                style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "12px",
                  background: "#8B5CF6",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "20px",
                  color: "white",
                  fontWeight: 700,
                }}
              >
                ?
              </div>
              <span style={{ color: "#FAFAFA", fontSize: "22px", fontWeight: 700, letterSpacing: "-0.02em" }}>
                Who Said That
              </span>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 16px",
                borderRadius: "100px",
                background: "rgba(139, 92, 246, 0.12)",
                color: "#A78BFA",
                fontSize: "14px",
                fontWeight: 600,
              }}
            >
              FHE Encrypted
            </div>
          </div>

          {/* Confession */}
          <div style={{ display: "flex", flexDirection: "column", gap: "16px", flex: 1, justifyContent: "center", paddingTop: "20px", paddingBottom: "20px" }}>
            <p
              style={{
                color: "#FAFAFA",
                fontSize: "32px",
                fontStyle: "italic",
                fontWeight: 300,
                lineHeight: 1.5,
                maxWidth: "900px",
                letterSpacing: "-0.01em",
              }}
            >
              &ldquo;{confessionText}&rdquo;
            </p>
          </div>

          {/* Footer */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              borderTop: "1px solid #1E1E21",
              paddingTop: "20px",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <span style={{ color: "#71717A", fontSize: "13px", fontWeight: 500, textTransform: "uppercase" as const, letterSpacing: "0.05em" }}>
                Sent anonymously to
              </span>
              <span style={{ color: "#FAFAFA", fontSize: "18px", fontWeight: 600 }}>
                @{recipientName}
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "2px" }}>
                <span style={{ color: "#8B5CF6", fontSize: "24px", fontWeight: 700, letterSpacing: "-0.03em" }}>
                  {confessionCount}
                </span>
                <span style={{ color: "#71717A", fontSize: "11px", fontWeight: 500, textTransform: "uppercase" as const, letterSpacing: "0.05em" }}>
                  Confessions
                </span>
              </div>
              <div style={{ width: "1px", height: "32px", background: "#1E1E21" }} />
              <span style={{ color: "#22C55E", fontSize: "15px", fontWeight: 600 }}>
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
