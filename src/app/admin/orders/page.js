"use client";
import { useState, useEffect, useCallback } from "react";
import { AdminC as C, AdminS as S, SectionHeader, AdminTable, StatusBadge, ScoreBar, MetricsRow, MetricCard } from "@/components/admin/Layout";

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    const { getBrowserClient } = await import("@/lib/db");
    const client = await getBrowserClient();
    const [{ data: ordersData }, { data: tailors }] = await Promise.all([
      client.from("orders").select("*").order("created_at", { ascending: false }).limit(200),
      client.from("tailors").select("id, name"),
    ]);
    const tailorMap = {};
    tailors?.forEach(t => { tailorMap[t.id] = t.name; });
    setOrders((ordersData || []).map(o => ({ ...o, tailorName: tailorMap[o.tailor_id] || "—" })));
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const now = new Date();
  const todayOrders = orders.filter(o => o.created_at?.startsWith(now.toISOString().split("T")[0]));
  const overdue = orders.filter(o => o.status !== "Delivered" && o.delivery_date && new Date(o.delivery_date) < now);
  const delivered = orders.filter(o => o.status === "Delivered");

  const filtered = orders.filter(o => {
    if (statusFilter !== "all" && o.status?.toLowerCase().replace(/ /g, "_") !== statusFilter) return false;
    if (search && !o.cloth_type?.toLowerCase().includes(search.toLowerCase()) && !o.tailorName?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div>
      <SectionHeader title="Orders" />
      <MetricsRow>
        <MetricCard label="Total Orders" value={orders.length} />
        <MetricCard label="Today" value={todayOrders.length} color={C.accent} />
        <MetricCard label="Delivered" value={delivered.length} color={C.green} />
        <MetricCard label="Overdue" value={overdue.length} color={C.red} />
      </MetricsRow>
      <div style={{ marginTop: 16 }}>
        <SectionHeader title="All Orders" action={
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            {["all","in_progress","ready","delivered"].map(s => (
              <div key={s} onClick={() => setStatusFilter(s)}
                style={{
                  padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: "pointer",
                  minHeight: 26, display: "flex", alignItems: "center",
                  backgroundColor: statusFilter === s ? C.accent : C.s2,
                  color: statusFilter === s ? "#fff" : C.sub,
                }} className="tap"
              >
                {s === "in_progress" ? "In Progress" : s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
              </div>
            ))}
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…"
              style={{
                padding: "4px 10px", fontSize: 12, borderRadius: 6, border: `1px solid ${C.border}`,
                backgroundColor: C.s2, color: C.text, width: 160, fontFamily: "inherit",
              }} />
          </div>
        } />
        <AdminTable
          columns={[
            { key: "tailorName", label: "Business" },
            { key: "cloth_type", label: "Item" },
            { key: "status", label: "Status", render: (v) => <StatusBadge status={v?.toLowerCase().replace(/ /g, "_") || "unknown"} /> },
            { key: "price", label: "Price", align: "right", render: (v) => v ? `₦${parseFloat(v).toLocaleString("en-NG")}` : "—" },
            { key: "delivery_date", label: "Delivery", render: (v) => v ? new Date(v).toLocaleDateString() : "—" },
            { key: "created_at", label: "Created", render: (v) => v ? new Date(v).toLocaleDateString() : "—" },
          ]}
          rows={filtered}
        />
      </div>
    </div>
  );
}
