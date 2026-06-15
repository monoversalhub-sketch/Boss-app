"use client";
import { useState, useEffect, useCallback } from "react";
import { AdminC as C, AdminS as S, MetricsRow, MetricCard, SectionHeader, ScoreBar, AdminTable, StatusBadge } from "@/components/admin/Layout";

const PULSE_RED = "#FF453A";
const PULSE_AMBER = "#FF9F0A";
const PULSE_GREEN = "#30D158";

function PulseDot({ color }) {
  return (
    <span style={{
      display: "inline-block", width: 8, height: 8, borderRadius: "50%",
      backgroundColor: color, marginRight: 6,
      animation: "pulse 1.5s infinite",
      verticalAlign: "middle",
    }} />
  );
}

export default function MissionControlPage() {
  const [metrics, setMetrics] = useState(null);
  const [churn, setChurn] = useState(null);
  const [trust, setTrust] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/dashboard");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setMetrics(json.metrics);
      setChurn(json.churn);
      setTrust(json.trust);
    } catch (err) {
      console.error("Mission Control load error:", err);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading && !metrics) {
    return (
      <div>
        <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: "-0.5px", marginBottom: 24 }}>
          Mission Control
        </div>
        {[1,2,3].map(i => (
          <div key={i} style={{
            ...S.card, height: 80, marginBottom: 12,
            background: `linear-gradient(90deg, ${C.s2} 25%, ${C.s3} 50%, ${C.s2} 75%)`,
            backgroundSize: "200% 100%",
            animation: "shimmer 1.5s infinite",
          }} />
        ))}
        <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}@keyframes pulse{0%{opacity:1}50%{opacity:0.4}100%{opacity:1}}`}</style>
      </div>
    );
  }

  const scoreDist = metrics?.trustScoreDistribution || {};
  const totalScores = Object.values(scoreDist).reduce((a, b) => a + b, 0);

  const recentChurn = churn?.all?.slice(0, 5) || [];

  return (
    <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: "-0.5px" }}>Mission Control</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <PulseDot color={PULSE_GREEN} />
          <span style={{ fontSize: 12, fontWeight: 600, color: C.sub }}>
            {metrics?.activeBusinesses || 0} active businesses
          </span>
        </div>
      </div>

      <MetricsRow>
        <MetricCard label="Active Businesses" value={metrics?.activeBusinesses || 0}
          sub={`${metrics?.inactiveBusinesses || 0} inactive`} />
        <MetricCard label="Orders Today" value={metrics?.ordersCreatedToday || 0}
          sub={`${metrics?.totalOrders || 0} total`} />
        <MetricCard label="Payments Today" value={metrics?.paymentsRecordedToday || 0}
          sub={`₦${(metrics?.revenueToday || 0).toLocaleString("en-NG")}`} />
        <MetricCard label="Total Revenue Tracked" value={`₦${(metrics?.totalRevenue || 0).toLocaleString("en-NG")}`} />
        <MetricCard label="Repeat Customer Rate" value={`${metrics?.repeatCustomerRate || 0}%`}
          color={metrics?.repeatCustomerRate >= 30 ? PULSE_GREEN : PULSE_AMBER} />
        <MetricCard label="Avg Trust Score" value={metrics?.avgScore || 0}
          color={(metrics?.avgScore || 0) >= 60 ? PULSE_GREEN : PULSE_AMBER} />
        <MetricCard label="Churn Risk Users" value={metrics?.churnRiskUsers || 0}
          color={(metrics?.churnRiskUsers || 0) > 0 ? PULSE_RED : PULSE_GREEN}
          sub={`${churn?.byLevel?.critical || 0} critical, ${churn?.byLevel?.high || 0} high`} />
        <MetricCard label="Healthy Businesses" value={metrics?.healthyBusinesses || 0}
          color={PULSE_GREEN} />
      </MetricsRow>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 24 }}>
        <div style={S.card}>
          <SectionHeader title="Trust Score Distribution" />
          {["0-20","21-40","41-60","61-80","81-100"].map(bucket => {
            const count = scoreDist[bucket] || 0;
            const pct = totalScores > 0 ? (count / totalScores) * 100 : 0;
            return (
              <div key={bucket} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.sub, minWidth: 48 }}>{bucket}</div>
                <div style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: C.s3, overflow: "hidden" }}>
                  <div style={{
                    width: `${pct}%`, height: "100%", borderRadius: 3,
                    backgroundColor: parseInt(bucket) >= 61 ? C.green : parseInt(bucket) >= 41 ? C.amber : C.red,
                    transition: "width 0.6s",
                  }} />
                </div>
                <div style={{ fontSize: 12, fontWeight: 600, color: C.text, minWidth: 24, textAlign: "right" }}>{count}</div>
              </div>
            );
          })}
        </div>

        <div style={S.card}>
          <SectionHeader title="Business Health Breakdown" />
          {["healthy","growing","at_risk","dormant"].map(cat => {
            const count = cat === "healthy" ? (metrics?.healthyBusinesses || 0)
              : cat === "growing" ? (metrics?.growingBusinesses || 0)
              : cat === "at_risk" ? (metrics?.atRiskBusinesses || 0)
              : (metrics?.dormantBusinesses || 0);
            const total = metrics?.totalBusinesses || 1;
            const pct = total > 0 ? (count / total) * 100 : 0;
            const colors = { healthy: C.green, growing: C.accent, at_risk: C.amber, dormant: C.muted };
            return (
              <div key={cat} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <StatusBadge status={cat} />
                <div style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: C.s3, overflow: "hidden" }}>
                  <div style={{
                    width: `${pct}%`, height: "100%", borderRadius: 3,
                    backgroundColor: colors[cat],
                    transition: "width 0.6s",
                  }} />
                </div>
                <div style={{ fontSize: 12, fontWeight: 600, color: C.text, minWidth: 24, textAlign: "right" }}>{count}</div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 16 }}>
        <div>
          <SectionHeader title="Churn Risk Alerts" action={
            <span style={{ fontSize: 12, color: C.red, fontWeight: 700 }}>{churn?.totalAtRisk || 0} at risk</span>
          } />
          <AdminTable
            columns={[
              { key: "tailor", label: "Business", render: (_, row) => row.tailor?.shop || "—" },
              { key: "risk_level", label: "Risk", render: (v) => <StatusBadge status={v} /> },
              { key: "days_since_last_active", label: "Days Inactive", align: "right" },
            ]}
            rows={recentChurn}
          />
        </div>
        <div>
          <SectionHeader title="Top Trust Scores" action={
            <span style={{ fontSize: 12, color: C.sub, fontWeight: 600 }}>Avg: {trust?.average || 0}</span>
          } />
          <AdminTable
            columns={[
              { key: "name", label: "Business" },
              { key: "score", label: "Score", render: (v) => <ScoreBar score={v || 0} showLabel height={6} /> },
            ]}
            rows={trust?.top10?.slice(0, 5) || []}
          />
        </div>
      </div>

      <div style={{ marginTop: 32, padding: 20, ...S.card, backgroundColor: C.s2, border: "none" }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: C.sub, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.3px" }}>
          Business Success Intelligence — Summary
        </div>
        <div style={{ fontSize: 14, color: C.text, lineHeight: 1.6 }}>
          <strong>{metrics?.totalBusinesses || 0}</strong> total businesses ·{" "}
          <strong>{metrics?.activeBusinesses || 0}</strong> active last 30 days ·{" "}
          <strong>₦{(metrics?.totalRevenue || 0).toLocaleString("en-NG")}</strong> tracked revenue ·{" "}
          <strong>{metrics?.totalOrders || 0}</strong> orders ·{" "}
          <strong>{metrics?.totalCustomers || 0}</strong> customers ·{" "}
          <strong>{trust?.total || 0}</strong> trust scores computed
        </div>
      </div>
    </div>
  );
}
