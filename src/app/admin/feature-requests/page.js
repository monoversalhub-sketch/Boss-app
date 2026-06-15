"use client";
import { useState, useEffect, useCallback } from "react";
import { AdminC as C, AdminS as S, SectionHeader, AdminTable, StatusBadge, MetricsRow, MetricCard } from "@/components/admin/Layout";

export default function FeatureRequestsPage() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/data", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ queries: [
        { key: "requests", table: "feature_requests", select: "*, tailor:tailors(shop)", order: "votes desc" },
      ]}),
    });
    const json = await res.json();
    setRequests(json.results?.[0]?.data || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const totalVotes = requests.reduce((s, r) => s + (r.votes || 0), 0);
  const shipped = requests.filter(r => r.status === "shipped");

  return (
    <div>
      <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: "-0.5px", marginBottom: 24 }}>
        Feature Requests
      </div>
      <MetricsRow>
        <MetricCard label="Total Requests" value={requests.length} />
        <MetricCard label="Total Votes" value={totalVotes} />
        <MetricCard label="Shipped" value={shipped.length} color={C.green} />
        <MetricCard label="Under Review" value={requests.filter(r => r.status === "under_review").length} color={C.amber} />
      </MetricsRow>
      <div style={{ marginTop: 16 }}>
        <SectionHeader title="All Requests" action={
          <span style={{ fontSize: 11, color: C.sub }}>Sorted by votes</span>
        } />
        <AdminTable
          columns={[
            { key: "title", label: "Request" },
            { key: "tailor", label: "From", render: (v) => v?.shop || "—" },
            { key: "category", label: "Category", render: (v) => v || "—" },
            { key: "votes", label: "Votes", align: "right" },
            { key: "status", label: "Status", render: (v) => <StatusBadge status={v === "under_review" ? "open" : v} /> },
            { key: "created_at", label: "Date", render: (v) => v ? new Date(v).toLocaleDateString() : "—" },
          ]}
          rows={requests}
        />
      </div>
    </div>
  );
}
