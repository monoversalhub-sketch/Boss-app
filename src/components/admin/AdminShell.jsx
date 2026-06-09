"use client";
import dynamic from "next/dynamic";
import { useAdminAuth } from "@/lib/admin/auth";

const AdminLayoutContents = dynamic(() => import("./LayoutContents"), { ssr: false });

export default function AdminShell({ children }) {
  const { admin, loading } = useAdminAuth();

  if (loading) {
    return (
      <div style={{
        height: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
        backgroundColor: "#0A0A0B", color: "#8E8E93", fontFamily: "var(--font-plus-jakarta),sans-serif",
        flexDirection: "column", gap: 16,
      }}>
        <div style={{ fontSize: 28, fontWeight: 900, color: "#F5F5F7", letterSpacing: "-0.5px" }}>
          BOSS<span style={{ color: "#0066CC" }}> Admin</span>
        </div>
        <div style={{ width: 24, height: 24, border: "2px solid #38383A", borderTopColor: "#0066CC", borderRadius: "50%", animation: "spin 0.6s linear infinite" }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  if (!admin) return null;

  return <AdminLayoutContents admin={admin}>{children}</AdminLayoutContents>;
}
