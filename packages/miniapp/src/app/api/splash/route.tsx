import { ImageResponse } from "@vercel/og";

export const runtime = "edge";

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "200",
          height: "200",
          display: "flex",
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
          }}
        >
          ?
        </div>
      </div>
    ),
    { width: 200, height: 200 }
  );
}
