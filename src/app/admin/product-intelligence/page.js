"use client";
import { useState, useEffect, useCallback } from "react";
import { AdminC as C, AdminS as S, SectionHeader, AdminTable, MetricsRow, MetricCard, StatusBadge, ScoreBar } from "@/components/admin/Layout";
import { getProductMetrics } from "@/lib/admin/analytics";
import { getFeatureIntelligence } from "@/lib/admin/analytics";

export default function ProductIntelligencePage() {
  const [data, setData] = useState(null);
  const [features, setFeatures] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("overview");

  const load = useCallback(async () => {
    try {
      const [d, f] = await Promise.all([
        getProductMetrics(30),
        getFeatureIntelligence(30),
      ]);
      setData(d);
      setFeatures(f);
    } catch (err) { console.error(err); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading && !data) return <div style={{color: C.sub}}>Loading product intelligence…</div>;

  const journeys = data?.journeys || [];
  const totalJourneyStarts = journeys.reduce((s, j) => s + j.started, 0);
  const avgCompletion = journeys.length
    ? Math.round(journeys.reduce((s, j) => s + j.completionRate, 0) / journeys.length)
    : 0;

  const sortedFeatures = [...(features || [])].sort((a, b) => b.usersReached - a.usersReached);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: "-0.5px" }}>Product Intelligence</div>
        <div style={{ display: "flex", gap: 6 }}>
          {["overview", "journeys", "features"].map(t => (
            <div key={t} onClick={() => setTab(t)}
              style={{
                padding: "4px 14px", borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: "pointer",
                minHeight: 28, display: "flex", alignItems: "center",
                backgroundColor: tab === t ? C.accent : C.s2,
                color: tab === t ? "#fff" : C.sub,
              }} className="tap"
            >
              {t === "overview" ? "Overview" : t.charAt(0).toUpperCase() + t.slice(1)}
            </div>
          ))}
        </div>
      </div>

      {tab === "overview" && (
        <>
          <MetricsRow>
            <MetricCard label="Avg Completion Rate" value={`${avgCompletion}%`}
              color={avgCompletion >= 70 ? C.green : C.amber} />
            <MetricCard label="Total Journeys" value={totalJourneyStarts} />
            <MetricCard label="Features Tracked" value={features?.length || 0} />
            <MetricCard label="Top Feature" value={sortedFeatures?.[0]?.feature || "—"}
              sub={`${sortedFeatures?.[0]?.usersReached || 0} users`} />
          </MetricsRow>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 24 }}>
            <div style={S.card}>
              <SectionHeader title="Journey Completion Rates" />
              {journeys.map(j => (
                <div key={j.journey} style={{ marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>
                      {j.journey.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: j.completionRate >= 60 ? C.green : C.amber }}>
                      {j.completionRate}%
                    </div>
                  </div>
                  <div style={{ height: 6, borderRadius: 3, backgroundColor: C.s3, overflow: "hidden" }}>
                    <div style={{
                      width: `${j.completionRate}%`, height: "100%", borderRadius: 3,
                      backgroundColor: j.completionRate >= 60 ? C.green : C.amber,
                      transition: "width 0.6s",
                    }} />
                  </div>
                  <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
                    {j.started} started · {j.completed} completed · {j.abandoned} abandoned
                  </div>
                </div>
              ))}
              {!journeys.length && <div style={{color: C.muted, fontSize: 13}}>No journey data yet. Events will populate as users interact.</div>}
            </div>

            <div style={S.card}>
              <SectionHeader title="What Should We Build Next?" action={
                <span style={{ fontSize: 11, color: C.sub }}>Data-driven decisions</span>
              } />
              <div style={{ fontSize: 13, color: C.sub, lineHeight: 1.7 }}>
                <div style={{ marginBottom: 12 }}>
                  <strong style={{ color: C.text }}>1. Lowest completion journeys</strong><br />
                  Identify which flows have highest abandonment and invest in UX improvements.
                </div>
                <div style={{ marginBottom: 12 }}>
                  <strong style={{ color: C.text }}>2. Underused features</strong><br />
                  Features with low activation → better onboarding, tooltips, or reconsider.
                </div>
                <div style={{ marginBottom: 12 }}>
                  <strong style={{ color: C.text }}>3. High-retention features</strong><br />
                  Double down on features with high repeat usage — they drive stickiness.
                </div>
                <div>
                  <strong style={{ color: C.text }}>4. Feature requests</strong><br />
                  Check Feature Requests tab for direct user feedback.
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {tab === "journeys" && (
        <div>
          <SectionHeader title="Journey Analytics" action={
            <span style={{fontSize:11,color:C.sub}}>Last 30 days</span>
          } />
          <AdminTable
            columns={[
              { key: "journey", label: "Journey", render: (v) => v.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()) },
              { key: "started", label: "Started", align: "right" },
              { key: "completed", label: "Completed", align: "right" },
              { key: "abandoned", label: "Abandoned", align: "right" },
              { key: "completionRate", label: "Completion Rate", render: (v) => `${v}%` },
              { key: "abandonmentRate", label: "Abandonment Rate", render: (v) => `${v}%` },
              { key: "avgCompletionTimeMs", label: "Avg Time", render: (v) => {
                if (!v) return "—";
                const s = Math.round(v / 1000);
                return s > 60 ? `${Math.floor(s / 60)}m ${s % 60}s` : `${s}s`;
              }},
            ]}
            rows={journeys}
          />
        </div>
      )}

      {tab === "features" && (
        <div>
          <SectionHeader title="Feature Intelligence" action={
            <span style={{fontSize:11,color:C.sub}}>Sorted by users reached</span>
          } />
          <AdminTable
            columns={[
              { key: "feature", label: "Feature" },
              { key: "usersReached", label: "Users Reached", align: "right" },
              { key: "usersActivated", label: "Users Activated", align: "right" },
              { key: "activationRate", label: "Activation", render: (v) => `${v}%` },
              { key: "repeatUsage", label: "Repeat Usage", align: "right" },
              { key: "views", label: "Views", align: "right" },
              { key: "uses", label: "Uses", align: "right" },
            ]}
            rows={sortedFeatures}
          />
        </div>
      )}
    </div>
  );
}
