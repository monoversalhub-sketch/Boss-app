"use client";
import { useState } from "react";
import { AdminC as C, AdminS as S, SectionHeader, AdminTable, MetricsRow, MetricCard, StatusBadge } from "@/components/admin/Layout";

export default function ExperimentsPage() {
  const [experiments] = useState([
    { id: "1", name: "Save Flow Speed Test", status: "running", variant: "fire-and-forget", users: 42, started: "2026-05-01", impact: "+32%" },
    { id: "2", name: "Voice Note on iOS", status: "running", variant: "mime-fix", users: 18, started: "2026-05-15", impact: "measuring" },
    { id: "3", name: "Back Button Design", status: "completed", variant: "bold-arrow", users: 100, started: "2026-04-20", impact: "+18%" },
    { id: "4", name: "Invoice Page Receipt", status: "running", variant: "web-invoice", users: 35, started: "2026-05-10", impact: "measuring" },
  ]);

  return (
    <div>
      <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: "-0.5px", marginBottom: 24 }}>
        Experiments
      </div>
      <MetricsRow>
        <MetricCard label="Active" value={experiments.filter(e => e.status === "running").length} color={C.accent} />
        <MetricCard label="Completed" value={experiments.filter(e => e.status === "completed").length} color={C.green} />
        <MetricCard label="Total Users" value={experiments.reduce((s, e) => s + e.users, 0)} />
      </MetricsRow>
      <div style={{ marginTop: 16 }}>
        <SectionHeader title="All Experiments" />
        <AdminTable
          columns={[
            { key: "name", label: "Experiment" },
            { key: "variant", label: "Variant" },
            { key: "status", label: "Status", render: (v) => <StatusBadge status={v === "running" ? "in_progress" : v === "completed" ? "resolved" : v} /> },
            { key: "users", label: "Users", align: "right" },
            { key: "impact", label: "Impact", render: (v) =>
              <span style={{color: v?.includes("+") ? C.green : C.muted, fontWeight: 700}}>{v}</span>
            },
            { key: "started", label: "Started" },
          ]}
          rows={experiments}
        />
      </div>
    </div>
  );
}
