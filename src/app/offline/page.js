"use client";
export default function OfflinePage() {
  return (
    <div style={{
      minHeight: "100svh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      background: "#0a0a0a",
      color: "#fff",
      fontFamily: "system-ui, sans-serif",
      padding: "32px 24px",
      textAlign: "center",
      gap: 16,
    }}>
      <div style={{ fontSize: 52 }}>📡</div>
      <div style={{ fontSize: 24, fontWeight: 900, letterSpacing: "-0.5px" }}>
        You&apos;re offline
      </div>
      <div style={{ fontSize: 15, color: "#888", lineHeight: 1.6, maxWidth: 300 }}>
        Connect to the internet to use BOSS. Your data
        is safe and will sync when you&apos;re back online.
      </div>
      <button
        onClick={() => window.location.reload()}
        style={{
          marginTop: 8, padding: "14px 28px",
          background: "#2563eb", color: "#fff",
          border: "none", borderRadius: 14,
          fontSize: 15, fontWeight: 700,
          cursor: "pointer", fontFamily: "inherit",
        }}
      >
        Try again
      </button>
    </div>
  );
}
