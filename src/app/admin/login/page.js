"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { AdminC as C } from "@/components/admin/Layout";

export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const { getBrowserClient } = await import("@/lib/db");
      const client = await getBrowserClient();
      const { data, error: authError } = await client.auth.signInWithPassword({ email, password });
      if (authError) throw authError;
      if (data?.user) {
        const { data: adminUser } = await client.from("admin_users")
          .select("id, role")
          .eq("email", data.user.email)
          .maybeSingle();
        if (adminUser) {
          localStorage.setItem("boss_admin_user", JSON.stringify(adminUser));
          router.push("/admin");
        } else {
          setError("Not an admin user");
          await client.auth.signOut();
        }
      }
    } catch (err) {
      setError(err.message || "Login failed");
    }
    setLoading(false);
  }

  const containerStyle = {
    display: "flex", alignItems: "center", justifyContent: "center",
    minHeight: "100vh", backgroundColor: "#0A0A0B",
    fontFamily: "var(--font-plus-jakarta), sans-serif",
  };

  return (
    <div style={containerStyle}>
      <div style={{
        backgroundColor: "#141416", borderRadius: 20, padding: 40,
        border: "1px solid #38383A", width: 380, maxWidth: "90vw",
      }}>
        <div style={{ fontSize: 28, fontWeight: 900, color: "#F5F5F7", marginBottom: 4 }}>
          BOSS<span style={{ color: "#0066CC" }}> Admin</span>
        </div>
        <div style={{ fontSize: 14, color: "#8E8E93", marginBottom: 32 }}>
          Sign in to Mission Control
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
            placeholder="Email" required
            style={{
              padding: "14px 16px", borderRadius: 10, border: "1px solid #38383A",
              backgroundColor: "#1C1C1E", color: "#F5F5F7", fontSize: 14,
              fontFamily: "inherit", outline: "none",
            }}
          />
          <input
            type="password" value={password} onChange={e => setPassword(e.target.value)}
            placeholder="Password" required
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
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}
