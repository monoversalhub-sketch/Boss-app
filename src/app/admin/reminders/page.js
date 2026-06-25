"use client";
import { useState, useEffect, useCallback } from "react";
import { AdminC as C, AdminS as S, SectionHeader, AdminTable, MetricsRow, MetricCard, StatusBadge } from "@/components/admin/Layout";

export default function AdminRemindersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const now = new Date();
    try {
      const res = await fetch("/api/admin/data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ queries: [
        { key: "orders", table: "orders", select: "*", order: "delivery_date asc" },
        { key: "tailors", table: "tailors", select: "id, shop" },
      ]}),
    });
    const json = await res.json();
    const results = {};
    (json.results || []).forEach(r => { results[r.key] = r.data || []; });
    const tailorMap = {};
    (results.tailors || []).forEach(t => { tailorMap[t.id] = t.shop; });

    setOrders((results.orders || []).map(o => ({
      ...o, tailorName: tailorMap[o.tailor_id] || "—",
      overdue: o.delivery_date && now > new Date(o.delivery_date + "T23:59:59"),
      dueToday: o.delivery_date && Math.abs(now - new Date(o.delivery_date)) < 86400000,
    })));
    } catch (e) { console.error("Failed to load reminders", e); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const dueSoon = orders.filter(o => o.isDueSoon);
  const overdue = orders.filter(o => o.isOverdue);

  return (
    <div>
      <SectionHeader title="Reminders Intelligence" />
      <MetricsRow>
        <MetricCard label="Orders Due This Week" value={dueSoon.length} color={C.amber} />
        <MetricCard label="Overdue Orders" value={overdue.length} color={C.red} />
        <MetricCard label="Total Pending" value={orders.filter(o => o.status !== "Delivered").length} />
      </MetricsRow>
      <div style={{ marginTop: 16 }}>
        <SectionHeader title="Due & Overdue Orders" />
        <AdminTable
          columns={[
            { key: "tailorName", label: "Tailor" },
            { key: "cloth_type", label: "Item" },
            { key: "status", label: "Status", render: (v) => <StatusBadge status={v ? v.toLowerCase().replace(/ /g,"_") : "unknown"} /> },
            { key: "delivery_date", label: "Delivery Date", render: (v) => v ? new Date(v).toLocaleDateString() : "—" },
            { key: "isDueSoon", label: "Flag", render: (v, row) =>
              row.isOverdue ? <span style={{color: C.red, fontWeight: 700}}>OVERDUE</span> :
              row.isDueSoon ? <span style={{color: C.amber, fontWeight: 700}}>DUE SOON</span> :
              <span style={{color: C.muted}}>—</span>
            },
          ]}
          rows={[...dueSoon, ...overdue]}
        />
      </div>
    </div>
  );
}
