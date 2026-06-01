"use client";
import { C, S } from "./tokens";

export function SessionGate({ session, onContinue, onSwitch }) {
  const meta = session?.user_metadata || {};
  const name = meta.full_name || meta.name || session?.email || "User";
  const avatar = meta.avatar_url || meta.picture || null;
  const email = session?.email || "";
  const initial = name[0].toUpperCase();
  const lastActive = typeof window !== "undefined" ? localStorage.getItem("boss_last_active") : null;

  function formatLastActive(stamp) {
    if (!stamp) return null;
    const diff = Date.now() - parseInt(stamp);
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return mins + " minute" + (mins !== 1 ? "s" : "") + " ago";
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return hrs + " hour" + (hrs !== 1 ? "s" : "") + " ago";
    const days = Math.floor(hrs / 24);
    return days + " day" + (days !== 1 ? "s" : "") + " ago";
  }

  function handleContinue() {
    localStorage.setItem("boss_last_active", String(Date.now()));
    onContinue();
  }

  return (
    <div style={{
      height: "100%", background: C.bg,
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      padding: 32, fontFamily: "'Plus Jakarta Sans',sans-serif",
    }}>
      {/* Logo */}
      <div style={{ textAlign: "center", marginBottom: 40 }}>
        <div style={{
          width: 72, height: 72, background: C.text, borderRadius: 22,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 32, fontWeight: 900, color: "#fff",
          margin: "0 auto 12px", boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
        }}>B</div>
        <div style={{ fontSize: 20, fontWeight: 900, letterSpacing: "-0.5px", color: C.text }}>Who's using BOSS?</div>
      </div>

      {/* User card */}
      <div style={{
        background: C.s1, borderRadius: 20, padding: 24,
        width: "100%", maxWidth: 300, textAlign: "center",
        border: `1px solid ${C.border}`, marginBottom: 20,
      }}>
        {avatar ? (
          <img src={avatar} alt="" style={{ width: 56, height: 56, borderRadius: 28, margin: "0 auto 12px", display: "block" }} />
        ) : (
          <div style={{
            width: 56, height: 56, borderRadius: 28, background: C.s3,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 22, fontWeight: 800, color: C.text,
            margin: "0 auto 12px",
          }}>{initial}</div>
        )}
        <div style={{ fontSize: 17, fontWeight: 800, color: C.text }}>Welcome back{name ? ", " + name.split(" ")[0] : ""}</div>
        <div style={{ fontSize: 13, color: C.sub, marginTop: 4 }}>{email}</div>
        {lastActive && (
          <div style={{ fontSize: 12, color: C.muted, marginTop: 8 }}>Last active: {formatLastActive(lastActive)}</div>
        )}
      </div>

      {/* Continue button */}
      <button
        className="tap"
        onClick={handleContinue}
        style={{
          ...S.btn,
          background: C.green, color: "#fff", fontSize: 16, fontWeight: 800,
          maxWidth: 300, marginBottom: 12,
        }}>
        ▶ Continue as {name.split(" ")[0]}
      </button>

      {/* Switch Account */}
      <button
        className="tap"
        onClick={onSwitch}
        style={{
          ...S.btn,
          background: "transparent", color: C.sub, fontSize: 14, fontWeight: 600,
          maxWidth: 300, border: `1px solid ${C.border2}`,
        }}>
        Switch Account
      </button>
    </div>
  );
}
