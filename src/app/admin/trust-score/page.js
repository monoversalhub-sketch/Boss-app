"use client";
import { useState, useEffect, useCallback } from "react";
import { AdminC as C, AdminS as S, MetricsRow, MetricCard, SectionHeader, ScoreBar, AdminTable, StatusBadge } from "@/components/admin/Layout";

export default function TrustScorePage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/trust-intelligence");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setData(json);
    } catch (err) { console.error(err); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading && !data) return <div style={{color: C.sub}}>Loading trust score intelligence…</div>;

  const dist = data?.distribution || {};
  const total = data?.total || 0;

  return (
    <div>
      <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: "-0.5px", marginBottom: 24 }}>
        Trust Score Intelligence
      </div>

      <MetricsRow>
        <MetricCard label="Average Score" value={data?.average || 0}
          color={(data?.average || 0) >= 60 ? C.green : C.amber} />
        <MetricCard label="Median Score" value={data?.median || 0} />
        <MetricCard label="Top Score" value={data?.top10?.[0]?.score || 0} color={C.green} />
        <MetricCard label="Businesses Scored" value={total} />
        <MetricCard label="Low Scorers (&lt;40)" value={(() => {
          const low = (dist["0-20"] || 0) + (dist["21-40"] || 0);
          return low;
        })()} color={C.red} />
      </MetricsRow>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 24 }}>
        <div style={S.card}>
          <SectionHeader title="Score Distribution" />
          {Object.entries(dist).map(([bucket, count]) => {
            const pct = total > 0 ? (count / total) * 100 : 0;
            const bucketNum = parseInt(bucket.split("-")[0]);
            return (
              <div key={bucket} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.sub, minWidth: 48 }}>{bucket}</div>
                <div style={{ flex: 1, height: 8, borderRadius: 4, backgroundColor: C.s3, overflow: "hidden" }}>
                  <div style={{
                    width: `${pct}%`, height: "100%", borderRadius: 4,
                    backgroundColor: bucketNum >= 61 ? C.green : bucketNum >= 41 ? C.amber : C.red,
                    transition: "width 0.8s ease",
                  }} />
                </div>
                <div style={{ fontSize: 12, fontWeight: 600, color: C.text, minWidth: 24, textAlign: "right" }}>{count}</div>
              </div>
            );
          })}
        </div>

        <div style={S.card}>
          <SectionHeader title="Score Components" action={
            <span style={{ fontSize: 11, color: C.sub }}>Weights: 30% completion · 25% repeat · 25% payment · 20% revenue</span>
          } />
          <div style={{ fontSize: 13, color: C.sub, lineHeight: 1.7, marginTop: 8 }}>
            <strong style={{ color: C.text }}>Completion Rate</strong> — 30pts: Orders delivered vs total.<br />
            <strong style={{ color: C.text }}>Repeat Rate</strong> — 25pts: Customers who order more than once.<br />
            <strong style={{ color: C.text }}>Payment Rate</strong> — 25pts: Delivered orders fully paid.<br />
            <strong style={{ color: C.text }}>Revenue Score</strong> — 20pts: Avg revenue per order.<br />
            <strong style={{ color: C.red }}>Overdue Penalty</strong> — -5pts per overdue job (max -30).
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 16 }}>
        <div>
          <SectionHeader title="Highest Scoring" action={<span style={{fontSize:11,color:C.sub}}>Top 10</span>} />
          <AdminTable
            columns={[
              { key: "name", label: "Business" },
              { key: "score", label: "Score", render: (v) => <ScoreBar score={v || 0} showLabel height={6} /> },
              { key: "email", label: "Email" },
            ]}
            rows={data?.top10 || []}
          />
        </div>
        <div>
          <SectionHeader title="Lowest Scoring" action={<span style={{fontSize:11,color:C.sub}}>Bottom 10</span>} />
          <AdminTable
            columns={[
              { key: "name", label: "Business" },
              { key: "score", label: "Score", render: (v) => <ScoreBar score={v || 0} showLabel height={6} /> },
              { key: "email", label: "Email" },
            ]}
            rows={data?.bottom10 || []}
          />
        </div>
      </div>

      <div style={{ marginTop: 24, ...S.card }}>
        <SectionHeader title="Recent Score Changes" action={
          <span style={{ fontSize: 11, color: C.sub }}>Last 50 changes</span>
        } />
        <AdminTable
          columns={[
            { key: "tailor_id", label: "Business", render: (v) => v?.substring(0, 8) + "…" },
            { key: "score", label: "Score", render: (v) => <ScoreBar score={v || 0} showLabel height={6} /> },
            { key: "delta", label: "Change", render: (v) => {
              if (!v || v === 0) return <span style={{color: C.muted}}>—</span>;
              return <span style={{color: v > 0 ? C.green : C.red, fontWeight: 700}}>
                {v > 0 ? "+" : ""}{v}
              </span>;
            }},
            { key: "reason", label: "Reason" },
            { key: "created_at", label: "Date", render: (v) => v ? new Date(v).toLocaleDateString() : "—" },
          ]}
          rows={data?.recentChanges || []}
        />
      </div>
    </div>
  );
}
