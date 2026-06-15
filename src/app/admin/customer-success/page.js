"use client";
import { useState, useEffect, useCallback } from "react";
import { AdminC as C, AdminS as S, MetricsRow, MetricCard, SectionHeader, AdminTable, StatusBadge, ScoreBar } from "@/components/admin/Layout";

export default function CustomerSuccessPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/churn-intelligence");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setData(json);
    } catch (err) { console.error(err); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading && !data) return <div style={{color: C.sub}}>Loading customer success intelligence…</div>;

  const atRisk = data?.all || [];
  const filtered = filter === "all" ? atRisk
    : atRisk.filter(c => c.risk_level === filter);

  return (
    <div>
      <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: "-0.5px", marginBottom: 24 }}>
        Customer Success Center
      </div>

      <MetricsRow>
        <MetricCard label="Total At Risk" value={data?.totalAtRisk || 0} color={C.red}
          sub={`${data?.byLevel?.critical || 0} critical · ${data?.byLevel?.high || 0} high`} />
        <MetricCard label="Critical" value={data?.byLevel?.critical || 0} color="#FF375F" />
        <MetricCard label="High Risk" value={data?.byLevel?.high || 0} color={C.amber} />
        <MetricCard label="Inactive (&gt;30d)" value={data?.inactiveUsers || 0} color={C.muted} />
        <MetricCard label="Healthy" value={data?.byLevel?.low || 0} color={C.green} />
      </MetricsRow>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 24 }}>
        <div style={S.card}>
          <SectionHeader title="Risk Breakdown" />
          {["critical", "high", "medium", "low"].map(level => {
            const count = data?.byLevel?.[level] || 0;
            const colors = { critical: "#FF375F", high: C.amber, medium: C.accent, low: C.green };
            return (
              <div key={level} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <StatusBadge status={level} />
                <div style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: C.s3, overflow: "hidden" }}>
                  <div style={{
                    width: `${(count / Math.max(1, atRisk.length)) * 100}%`,
                    height: "100%", borderRadius: 3,
                    backgroundColor: colors[level],
                    transition: "width 0.6s",
                  }} />
                </div>
                <div style={{ fontSize: 12, fontWeight: 600, color: C.text, minWidth: 24, textAlign: "right" }}>{count}</div>
              </div>
            );
          })}
        </div>

        <div style={S.card}>
          <SectionHeader title="Intervention Playbook" />
          <div style={{ fontSize: 13, color: C.sub, lineHeight: 1.7 }}>
            <div style={{ marginBottom: 12 }}>
              <span style={S.badge("#FF375F")}>Critical</span>
              <span style={{ marginLeft: 8, color: C.text }}>Personal outreach call. Offer 1-on-1 onboarding session.</span>
            </div>
            <div style={{ marginBottom: 12 }}>
              <span style={S.badge(C.amber)}>High</span>
              <span style={{ marginLeft: 8, color: C.text }}>Send re-engagement email. Share success stories.</span>
            </div>
            <div style={{ marginBottom: 12 }}>
              <span style={S.badge(C.accent)}>Medium</span>
              <span style={{ marginLeft: 8, color: C.text }}>Push notification. In-app tips. Feature spotlight.</span>
            </div>
            <div>
              <span style={S.badge(C.green)}>Low</span>
              <span style={{ marginLeft: 8, color: C.text }}>Maintain. Monthly newsletter. Referral encouragement.</span>
            </div>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 24 }}>
        <SectionHeader title="Risk Assessment" action={
          <div style={{ display: "flex", gap: 6 }}>
            {["all","critical","high","medium","low"].map(f => (
              <div key={f} onClick={() => setFilter(f)}
                style={{
                  padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 700,
                  cursor: "pointer", minHeight: 26, display: "flex", alignItems: "center",
                  backgroundColor: filter === f ? C.accent : C.s2,
                  color: filter === f ? "#fff" : C.sub,
                }} className="tap"
              >
                {f}
              </div>
            ))}
          </div>
        } />
        <AdminTable
          columns={[
            { key: "tailor", label: "Business", render: (_, r) => r.tailor?.shop || "—" },
            { key: "risk_level", label: "Risk Level", render: (v) => <StatusBadge status={v} /> },
            { key: "risk_score", label: "Score", render: (v) => <ScoreBar score={v || 0} showLabel height={6} /> },
            { key: "days_since_last_active", label: "Days Inactive", align: "right" },
            { key: "orders_declining", label: "Orders ↓", render: (v) => v ? "⚠️" : "✓" },
            { key: "intervention_recommended", label: "Recommended Action" },
          ]}
          rows={filtered}
        />
      </div>
    </div>
  );
}
