"use client";
import { useState, useEffect, useCallback } from "react";
import { AdminC as C, AdminS as S, SectionHeader, AdminTable, StatusBadge, ScoreBar } from "@/components/admin/Layout";

export default function BusinessesPage() {
  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState("all");

  const load = useCallback(async () => {
    const { getBrowserClient } = await import("@/lib/db");
    const client = await getBrowserClient();
    const [{ data: tailors }, { data: health }, { data: churn }] = await Promise.all([
      client.from("tailors").select("id, name, email, phone, bos_score, created_at, last_active_at").order("created_at", { ascending: false }),
      client.from("business_health_scores").select("*"),
      client.from("churn_risk").select("*"),
    ]);

    const healthMap = {};
    health?.forEach(h => { healthMap[h.tailor_id] = h; });
    const churnMap = {};
    churn?.forEach(c => { churnMap[c.tailor_id] = c; });

    setBusinesses((tailors || []).map(t => ({
      ...t,
      health: healthMap[t.id]?.category || "unknown",
      healthScore: healthMap[t.id]?.score || 0,
      churnRisk: churnMap[t.id]?.risk_level || "unknown",
      churnScore: churnMap[t.id]?.risk_score || 0,
    })));
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = categoryFilter === "all"
    ? businesses
    : businesses.filter(b => b.health === categoryFilter);

  return (
    <div>
      <SectionHeader title="Businesses" action={
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          {["all","healthy","growing","at_risk","dormant"].map(cat => (
            <div key={cat} onClick={() => setCategoryFilter(cat)}
              style={{
                padding: "4px 12px", borderRadius: 6, fontSize: 12, fontWeight: 700,
                cursor: "pointer", minHeight: 28, display: "flex", alignItems: "center",
                backgroundColor: categoryFilter === cat ? C.accent : C.s2,
                color: categoryFilter === cat ? "#fff" : C.sub,
                transition: "all 0.12s",
              }} className="tap"
            >
              {cat === "all" ? "All" : cat.replace("_", " ")}
            </div>
          ))}
          <span style={{ fontSize: 12, color: C.sub, marginLeft: 8 }}>{filtered.length}</span>
        </div>
      } />
      <AdminTable
        columns={[
          { key: "name", label: "Business" },
          { key: "email", label: "Email" },
          { key: "bos_score", label: "Trust Score", render: (v) => <ScoreBar score={v || 0} showLabel height={6} /> },
          { key: "health", label: "Health", render: (v) => <StatusBadge status={v === "unknown" ? "dormant" : v} /> },
          { key: "churnRisk", label: "Churn Risk", render: (v) => {
            if (v === "unknown") return <span style={{color: C.muted, fontSize: 12}}>—</span>;
            return <StatusBadge status={v} />;
          }},
          { key: "last_active_at", label: "Last Active", render: (v) => v
            ? Math.floor((new Date() - new Date(v)) / 86400000) + "d ago"
            : "Never",
          },
        ]}
        rows={filtered}
      />
    </div>
  );
}
