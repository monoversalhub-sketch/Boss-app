"use client";
import { useState, useEffect, useCallback } from "react";
import { AdminC as C, AdminS as S, SectionHeader, AdminTable, MetricsRow, MetricCard, StatusBadge } from "@/components/admin/Layout";

export default function AdminRemindersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { getEffectiveClient } = await import("@/lib/db");
    const client = await getEffectiveClient();
    const now = new Date();
    const [{ data: ordersData }, { data: tailors }] = await Promise.all([
      client.from("orders").select("*").order("delivery_date", { ascending: true }).limit(200),
      client.from("tailors").select("id, name"),
    ]);
    const tailorMap = {};
    tailors?.forEach(t => { tailorMap[t.id] = t.name; });

    setOrders((ordersData || []).map(o => ({
      ...o,
      tailorName: tailorMap[o.tailor_id] || "—",
      isDueSoon: o.delivery_date && o.status !== "Delivered" &&
        new Date(o.delivery_date) > now &&
        (new Date(o.delivery_date) - now) / 86400000 <= 7,
      isOverdue: o.delivery_date && o.status !== "Delivered" &&
        new Date(o.delivery_date) < now,
    })));
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
