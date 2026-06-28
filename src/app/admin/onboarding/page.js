"use client";
import { useState, useEffect, useCallback } from "react";
import { AdminC as C, AdminS as S, SectionHeader, AdminTable, StatusBadge } from "@/components/admin/Layout";

const MONOVERSAL_NUMBER = "+2348000000000";

const WELCOME_MSG = (shop) =>
`Hi ${shop || "there"}! 👋

Welcome to BOSS 🧵 — your business operating system for managing orders, customers, and payments, built for Nigerian fashion designers and tailors.

Please save this number as "BOSS Hub" so you never miss updates:
${MONOVERSAL_NUMBER}

Save it today and you'll receive:
✅ Income-boosting tips tailored for fashion designers
✅ Productivity tools & templates to run your shop
✅ New opportunities and features as they launch
✅ Free resources to grow your tailoring business

We're here to help you succeed! 🚀`;

export default function OnboardingPage() {
  const [tailors, setTailors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState({});

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/welcome");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setTailors(json.tailors || []);
    } catch (e) { console.error("Failed to load pending tailors", e); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function markSent(id) {
    try {
      const res = await fetch("/api/admin/welcome", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tailor_id: id }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setTailors(prev => prev.filter(t => t.id !== id));
    } catch (e) {
      console.error("Failed to mark welcome sent", e);
    }
  }

  function sendWelcome(tailor) {
    const msg = WELCOME_MSG(tailor.shop || tailor.id?.slice(0, 8));
    const p = (tailor.phone || "").replace(/\D/g, "");
    const num = p.startsWith("0") ? "234" + p.slice(1) : p.startsWith("234") ? p : "234" + p;
    const url = `https://wa.me/${num}?text=${encodeURIComponent(msg)}`;
    setSending(prev => ({ ...prev, [tailor.id]: true }));
    window.open(url, "_blank");
    setTimeout(async () => {
      await markSent(tailor.id);
      setSending(prev => ({ ...prev, [tailor.id]: false }));
    }, 3000);
  }

  return (
    <div>
      <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: "-0.5px", marginBottom: 24 }}>
        Onboarding
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
        <div style={S.card}>
          <SectionHeader title="Pending Welcomes" />
          <div style={{ fontSize: 36, fontWeight: 900, color: C.text }}>
            {tailors.length}
          </div>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>
            Tailors registered but haven&apos;t received a WhatsApp welcome
          </div>
        </div>
        <div style={S.card}>
          <SectionHeader title="Monoversal Hub Number" />
          <div style={{ fontSize: 16, fontWeight: 700, color: C.accent, marginBottom: 4 }}>
            {MONOVERSAL_NUMBER}
          </div>
          <div style={{ fontSize: 12, color: C.muted }}>
            Update in <code style={{color: C.text}}>src/app/admin/onboarding/page.js</code>
          </div>
        </div>
      </div>

      <div style={{ fontSize: 13, color: C.muted, marginBottom: 12, lineHeight: 1.6 }}>
        Click <strong style={{color: C.text}}>Send Welcome</strong> to open WhatsApp with a pre-composed welcome message.
        The tailor is automatically marked as welcomed after 3 seconds.
        Only tailors with a phone number and no previous welcome are shown.
      </div>

      <AdminTable
        columns={[
          { key: "shop", label: "Business" },
          { key: "phone", label: "Phone" },
          { key: "created_at", label: "Joined", render: (v) => v ? new Date(v).toLocaleDateString() : "—" },
          { key: "welcome_sent_at", label: "Status", render: () => <StatusBadge status="open" /> },
          { key: "actions", label: "Action", render: (_, row) => (
            <div
              onClick={() => !sending[row.id] && sendWelcome(row)}
              style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                padding: "6px 14px", borderRadius: 8, fontSize: 12, fontWeight: 700,
                backgroundColor: sending[row.id] ? C.s3 : "#25D366",
                color: sending[row.id] ? C.muted : "#fff",
                cursor: sending[row.id] ? "default" : "pointer",
                minHeight: 32, transition: "all 0.12s",
              }} className="tap"
            >
              {sending[row.id] ? "⏳ Sending..." : "💬 Send Welcome"}
            </div>
          )},
        ]}
        rows={tailors}
      />

      {!loading && !tailors.length && (
        <div style={{ textAlign: "center", padding: 48, color: C.sub, fontSize: 14 }}>
          ✅ All tailors have been welcomed!
        </div>
      )}
    </div>
  );
}
