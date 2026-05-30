"use client";
// src/components/boss/AuthScreen.jsx
import { useState, useEffect } from "react";
import { C, S } from "./tokens";
import { db } from "../../lib/db";

export function AuthScreen({ onAuthSuccess }) {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    db.getSession().then(session => {
      if (session?.email) onAuthSuccess({ email: session.email });
    });
  }, []);

  async function handleGoogle() {
    setLoading(true);
    setErr("");
    try {
      const { error } = await db.signInWithGoogle();
      if (error) { setErr(error.message); setLoading(false); }
    } catch {
      setErr("Could not connect to Google. Try again.");
      setLoading(false);
    }
  }

  return (
    <div style={{
      height: "100%", background: C.bg,
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      padding: 32, fontFamily: "'Plus Jakarta Sans',sans-serif"
    }}>
      {/* Logo */}
      <div style={{ textAlign: "center", marginBottom: 48 }}>
        <div style={{
          width: 80, height: 80, background: C.text, borderRadius: 24,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 40, fontWeight: 900, color: "#fff",
          margin: "0 auto 16px", boxShadow: "0 8px 30px rgba(0,0,0,0.15)"
        }}>B</div>
        <div style={{ fontSize: 32, fontWeight: 900, letterSpacing: "-1px", color: C.text }}>BOSS</div>
        <div style={{ fontSize: 13, color: C.sub, marginTop: 6, letterSpacing: "1px", textTransform: "uppercase" }}>
          Build Trust. Grow Faster.
        </div>
      </div>

      {/* Google button */}
      <button
        className="tap"
        onClick={handleGoogle}
        disabled={loading}
        style={{
          ...S.btn,
          background: "#fff",
          color: "#1C1C1E",
          border: "1.5px solid #E5E5EA",
          display: "flex", alignItems: "center", justifyContent: "center",
          gap: 12, fontSize: 16, fontWeight: 700,
          opacity: loading ? 0.6 : 1,
          boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
          maxWidth: 320, width: "100%",
        }}>
        <svg width="20" height="20" viewBox="0 0 48 48">
          <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.2l6.7-6.7C35.7 2.5 30.2 0 24 0 14.7 0 6.7 5.4 2.9 13.3l7.8 6C12.4 13 17.8 9.5 24 9.5z" />
          <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17z" />
          <path fill="#FBBC05" d="M10.7 28.7A14.6 14.6 0 0 1 9.5 24c0-1.6.3-3.2.8-4.7l-7.8-6A23.9 23.9 0 0 0 0 24c0 3.9.9 7.5 2.5 10.8l8.2-6.1z" />
          <path fill="#34A853" d="M24 48c6.2 0 11.4-2 15.2-5.5l-7.5-5.8c-2.1 1.4-4.7 2.3-7.7 2.3-6.2 0-11.5-4.2-13.3-9.8l-8.2 6.1C6.6 42.5 14.7 48 24 48z" />
          <path fill="none" d="M0 0h48v48H0z" />
        </svg>
        {loading ? "Connecting…" : "Continue with Google"}
      </button>

      {/* Error */}
      {err && (
        <div style={{ marginTop: 16, fontSize: 13, color: C.red, fontWeight: 500, textAlign: "center", maxWidth: 280 }}>
          {err}
        </div>
      )}

      {/* Footer note */}
      <div style={{ position: "absolute", bottom: 32, fontSize: 11, color: C.muted, textAlign: "center", padding: "0 32px", lineHeight: 1.6 }}>
        By continuing you agree to BOSS terms of service.{"\n"}Your Google account is used only for sign-in.
      </div>
    </div>
  );
}
