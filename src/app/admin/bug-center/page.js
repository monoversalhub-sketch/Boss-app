"use client";
import { useState, useEffect, useCallback } from "react";
import { AdminC as C, AdminS as S, SectionHeader, AdminTable, StatusBadge, MetricsRow, MetricCard } from "@/components/admin/Layout";

export default function BugCenterPage() {
  const [bugs, setBugs] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/data", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ queries: [
        { key: "bugs", table: "bug_reports", select: "*, tailor:tailors(name)", order: "created_at desc" },
      ]}),
    });
    const json = await res.json();
    setBugs(json.results?.[0]?.data || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const openBugs = bugs.filter(b => b.status !== "fixed" && b.status !== "closed");
  const criticalBugs = bugs.filter(b => b.severity === "critical" && b.status !== "fixed");

  return (
    <div>
      <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: "-0.5px", marginBottom: 24 }}>
        Bug Center
      </div>
      <MetricsRow>
        <MetricCard label="Open Bugs" value={openBugs.length} color={C.amber} />
        <MetricCard label="Critical" value={criticalBugs.length} color={C.red} />
        <MetricCard label="Fixed" value={bugs.filter(b => b.status === "fixed").length} color={C.green} />
        <MetricCard label="Total Reported" value={bugs.length} />
      </MetricsRow>
      <div style={{ marginTop: 16 }}>
        <SectionHeader title="Bug Reports" />
        <AdminTable
          columns={[
            { key: "title", label: "Bug" },
            { key: "tailor", label: "Reporter", render: (v) => v?.name || "—" },
            { key: "severity", label: "Severity", render: (v) => <StatusBadge status={v === "critical" ? "critical" : v === "major" ? "high" : v === "minor" ? "medium" : "low"} /> },
            { key: "status", label: "Status", render: (v) => <StatusBadge status={v} /> },
            { key: "created_at", label: "Reported", render: (v) => v ? new Date(v).toLocaleDateString() : "—" },
          ]}
          rows={bugs}
        />
      </div>
    </div>
  );
}
