"use client";
import { AdminC as C, AdminS as S, SectionHeader } from "@/components/admin/Layout";

export default function AdminSettingsPage() {
  return (
    <div>
      <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: "-0.5px", marginBottom: 24 }}>
        Settings
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 600 }}>
        <div style={S.card}>
          <SectionHeader title="Admin Users" />
          <div style={{ fontSize: 13, color: C.sub, lineHeight: 1.7 }}>
            Admin user management will be available once auth is configured.<br />
            Roles: <strong style={{color: C.text}}>Admin</strong>, <strong style={{color: C.text}}>Support</strong>, <strong style={{color: C.text}}>Analyst</strong>, <strong style={{color: C.text}}>Read-only</strong>
          </div>
        </div>
        <div style={S.card}>
          <SectionHeader title="Data Sync" />
          <div style={{ fontSize: 13, color: C.sub, lineHeight: 1.7 }}>
            <div>Health scores computed: <strong style={{color: C.text}}>Daily (cron)</strong></div>
            <div>Churn risk computed: <strong style={{color: C.text}}>Daily (cron)</strong></div>
            <div>Credit readiness: <strong style={{color: C.text}}>On-demand</strong></div>
            <div>Cache version: <strong style={{color: C.text}}>v2</strong></div>
          </div>
        </div>
        <div style={S.card}>
          <SectionHeader title="System Info" />
          <div style={{ fontSize: 13, color: C.sub, lineHeight: 1.7 }}>
            <div>App: <strong style={{color: C.text}}>BOSS Africa</strong></div>
            <div>Build: <strong style={{color: C.text}}>Next.js 16.2.7 + React 19.2.7</strong></div>
            <div>Database: <strong style={{color: C.text}}>Supabase (PostgreSQL)</strong></div>
            <div>Deploy: <strong style={{color: C.text}}>Vercel</strong></div>
          </div>
        </div>
      </div>
    </div>
  );
}
