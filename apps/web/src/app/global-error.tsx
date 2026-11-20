"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          alignItems: "center",
          background: "#070707",
          color: "#f4f4f4",
          display: "flex",
          fontFamily: "system-ui, sans-serif",
          justifyContent: "center",
          margin: 0,
          minHeight: "100svh",
          padding: "1.5rem",
          textAlign: "center",
        }}
      >
        <main style={{ maxWidth: "28rem" }}>
          <p style={{ color: "#a3a3a3", fontSize: "0.75rem", margin: 0 }}>Glyph Explorer</p>
          <h1 style={{ fontSize: "1.5rem", lineHeight: 1.2, margin: "0.75rem 0 0" }}>
            The explorer could not start
          </h1>
          <p style={{ color: "#a3a3a3", fontSize: "0.875rem", lineHeight: 1.6 }}>
            Reload the page. If the problem continues, the index may be unavailable.
          </p>
          <button
            onClick={reset}
            style={{
              background: "#f5f5f5",
              border: 0,
              borderRadius: 999,
              color: "#070707",
              cursor: "pointer",
              fontSize: "0.875rem",
              fontWeight: 600,
              marginTop: "1.5rem",
              padding: "0.6rem 1rem",
            }}
            type="button"
          >
            Try again
          </button>
          {error.digest ? (
            <p style={{ color: "#737373", fontSize: "0.7rem", marginTop: "1rem" }}>
              Reference {error.digest}
            </p>
          ) : null}
        </main>
      </body>
    </html>
  );
}
