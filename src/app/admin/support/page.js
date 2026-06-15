"use client";
import { useState, useEffect, useCallback } from "react";
import { AdminC as C, AdminS as S, SectionHeader, AdminTable, StatusBadge, MetricsRow, MetricCard } from "@/components/admin/Layout";

export default function SupportPage() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/data", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ queries: [
        { key: "tickets", table: "support_tickets", select: "*, tailor:tailors(name, email)", order: "created_at desc" },
      ]}),
    });
    const json = await res.json();
    setTickets(json.results?.[0]?.data || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const openTickets = tickets.filter(t => t.status === "open" || t.status === "in_progress");
  const criticalTickets = tickets.filter(t => t.priority === "critical" && t.status !== "closed");

  return (
    <div>
      <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: "-0.5px", marginBottom: 24 }}>
        Support Center
      </div>
      <MetricsRow>
        <MetricCard label="Open Tickets" value={openTickets.length} color={C.amber} />
        <MetricCard label="Critical" value={criticalTickets.length} color={C.red} />
        <MetricCard label="Total" value={tickets.length} />
        <MetricCard label="Resolved" value={tickets.filter(t => t.status === "resolved").length} color={C.green} />
      </MetricsRow>
      <div style={{ marginTop: 16 }}>
        <SectionHeader title="All Tickets" />
        <AdminTable
          columns={[
            { key: "subject", label: "Subject" },
            { key: "tailor", label: "Business", render: (v) => v?.name || "—" },
            { key: "priority", label: "Priority", render: (v) => <StatusBadge status={v === "critical" ? "critical" : v} /> },
            { key: "status", label: "Status", render: (v) => <StatusBadge status={v} /> },
            { key: "assigned_to", label: "Assigned To", render: (v) => v?.substring(0, 8) || "Unassigned" },
            { key: "created_at", label: "Created", render: (v) => v ? new Date(v).toLocaleDateString() : "—" },
          ]}
          rows={tickets}
        />
      </div>
    </div>
  );
}
