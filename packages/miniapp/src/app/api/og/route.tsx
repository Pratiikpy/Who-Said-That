import { ImageResponse } from "@vercel/og";

export const runtime = "edge";

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "1200",
          height: "630",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#09090B",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div
          style={{
            width: "80px",
            height: "80px",
            borderRadius: "20px",
            background: "#8B5CF6",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "40px",
            color: "white",
            fontWeight: 700,
            marginBottom: "32px",
          }}
        >
          ?
        </div>
        <h1
          style={{
            fontSize: "56px",
            fontWeight: 800,
            color: "#FAFAFA",
            letterSpacing: "-0.03em",
            marginBottom: "16px",
          }}
        >
          Who Said That
        </h1>
        <p
          style={{
            fontSize: "24px",
            color: "#A1A1AA",
            maxWidth: "600px",
            textAlign: "center",
          }}
        >
          Anonymous confessions. Encrypted onchain. AI-powered hints.
        </p>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
