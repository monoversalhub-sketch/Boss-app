"use client";
import { useState } from "react";
import { AdminC as C } from "@/components/admin/Layout";

export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error || "Not an admin user"); setLoading(false); return; }

      const { getBrowserClient } = await import("@/lib/db");
      const client = await getBrowserClient();
      const { error: magicError } = await client.auth.signInWithOtp({
        email: email.trim(),
        options: { shouldCreateUser: false },
      });
      if (magicError) throw magicError;

      localStorage.setItem("boss_admin_user", JSON.stringify(json.admin));
      setSent(true);
    } catch (err) {
      setError(err.message || "Failed to send magic link");
    }
    setLoading(false);
  }

  if (sent) {
    return (
      <div style={containerStyle}>
        <div style={cardStyle}>
          <div style={{ fontSize: 32, marginBottom: 12, textAlign: "center" }}>✉️</div>
          <div style={{ fontSize: 20, fontWeight: 900, color: "#F5F5F7", marginBottom: 8, textAlign: "center" }}>
            Check your email
          </div>
          <div style={{ fontSize: 14, color: "#8E8E93", textAlign: "center", lineHeight: 1.6 }}>
            A magic link was sent to <strong style={{color: "#F5F5F7"}}>{email}</strong>.<br />
            Click the link in the email to sign in.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <div style={{ fontSize: 28, fontWeight: 900, color: "#F5F5F7", marginBottom: 4 }}>
          BOSS<span style={{ color: "#0066CC" }}> Admin</span>
        </div>
        <div style={{ fontSize: 14, color: "#8E8E93", marginBottom: 32 }}>
          Enter your email to receive a magic link
        </div>
        {error && (
          <div style={{
            padding: "10px 14px", backgroundColor: "rgba(255,69,58,0.1)",
            border: "1px solid rgba(255,69,58,0.3)", borderRadius: 10,
            color: "#FF453A", fontSize: 13, fontWeight: 600, marginBottom: 16,
          }}>
            {error}
          </div>
        )}
        <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <input
            type="email" value={email} onChange={e => setEmail(e.target.value)}
            placeholder="admin@boss.app" required
            style={{
              padding: "14px 16px", borderRadius: 10, border: "1px solid #38383A",
              backgroundColor: "#1C1C1E", color: "#F5F5F7", fontSize: 14,
              fontFamily: "inherit", outline: "none",
            }}
          />
          <button type="submit" disabled={loading}
            style={{
              padding: "14px", borderRadius: 10, border: "none",
              backgroundColor: "#0066CC", color: "#fff",
              fontSize: 15, fontWeight: 700, cursor: "pointer",
              fontFamily: "inherit", opacity: loading ? 0.6 : 1,
              transition: "opacity 0.12s",
            }}
            className="tap"
          >
            {loading ? "Sending…" : "Send Magic Link"}
          </button>
        </form>
      </div>
    </div>
  );
}

const containerStyle = {
  display: "flex", alignItems: "center", justifyContent: "center",
  minHeight: "100vh", backgroundColor: "#0A0A0B",
  fontFamily: "var(--font-plus-jakarta), sans-serif",
};

const cardStyle = {
  backgroundColor: "#141416", borderRadius: 20, padding: 40,
  border: "1px solid #38383A", width: 380, maxWidth: "90vw",
};
