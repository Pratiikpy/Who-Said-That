"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        background: "#09090B",
        color: "#FAFAFA",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <div style={{ textAlign: "center", maxWidth: "320px" }}>
        <div
          style={{
            width: "64px",
            height: "64px",
            borderRadius: "16px",
            background: "#1C1C1F",
            border: "1px solid #27272A",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 24px",
            fontSize: "28px",
          }}
        >
          !
        </div>
        <h2
          style={{
            fontSize: "20px",
            fontWeight: 700,
            marginBottom: "8px",
          }}
        >
          Something went wrong
        </h2>
        <p
          style={{
            fontSize: "14px",
            color: "#71717A",
            marginBottom: "24px",
            lineHeight: 1.6,
          }}
        >
          {error.message || "An unexpected error occurred. Please try again."}
        </p>
        <button
          onClick={reset}
          style={{
            minHeight: "48px",
            padding: "14px 24px",
            borderRadius: "16px",
            background: "#8B5CF6",
            color: "white",
            fontWeight: 600,
            fontSize: "14px",
            border: "none",
            cursor: "pointer",
            width: "100%",
          }}
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
