"use client";

export default function UpdateBanner({ onUpdate, onDismiss }) {
  return (
    <div style={{
      position:     "fixed",
      bottom:       80,
      left:         "50%",
      transform:    "translateX(-50%)",
      width:        "calc(100% - 32px)",
      maxWidth:     448,
      zIndex:       9999,
      background:   "#0a0a0a",
      borderRadius: 20,
      padding:      "16px 18px",
      display:      "flex",
      alignItems:   "center",
      gap:          14,
      boxShadow:    "0 8px 32px rgba(0,0,0,0.28)",
      animation:    "slideUp 0.3s ease",
    }}>
      <style>{`
        @keyframes slideUp {
          from { transform: translateX(-50%) translateY(20px);
                 opacity: 0; }
          to   { transform: translateX(-50%) translateY(0);
                 opacity: 1; }
        }
      `}</style>
      <div style={{
        width: 42, height: 42, borderRadius: 12,
        background: "#1a1a1a", border: "1px solid #333",
        display: "flex", alignItems: "center",
        justifyContent: "center", fontSize: 20, flexShrink: 0,
      }}>
        🎉
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 14, fontWeight: 800, color: "#ffffff",
          letterSpacing: "-0.2px", marginBottom: 2,
        }}>
          Update available
        </div>
        <div style={{ fontSize: 12, color: "#888", lineHeight: 1.4 }}>
          New features are ready to install
        </div>
      </div>
      <button
        onClick={onDismiss}
        style={{
          background: "none", border: "none", color: "#555",
          fontSize: 20, cursor: "pointer", padding: "4px 6px",
          flexShrink: 0, lineHeight: 1, fontFamily: "inherit",
        }}
      >
        ✕
      </button>
      <button
        onClick={onUpdate}
        style={{
          background: "#2563eb", color: "#fff", border: "none",
          borderRadius: 12, padding: "10px 16px", fontSize: 13,
          fontWeight: 800, cursor: "pointer", flexShrink: 0,
          fontFamily: "inherit", whiteSpace: "nowrap",
          letterSpacing: "-0.2px",
        }}
      >
        Update now
      </button>
    </div>
  );
}
