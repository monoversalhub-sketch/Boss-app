"use client";
import { useState, useEffect, useCallback } from "react";
import { AdminC as C, AdminS as S, SectionHeader, AdminTable, MetricsRow, MetricCard } from "@/components/admin/Layout";

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { getEffectiveClient } = await import("@/lib/db");
    const client = await getEffectiveClient();
    const [{ data: customersData }, { data: tailors }] = await Promise.all([
      client.from("customers").select("*").order("created_at", { ascending: false }).limit(200),
      client.from("tailors").select("id, name"),
    ]);
    const tailorMap = {};
    tailors?.forEach(t => { tailorMap[t.id] = t.name; });
    setCustomers((customersData || []).map(c => ({ ...c, tailorName: tailorMap[c.tailor_id] || "—" })));
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const now = new Date();
  const todayCustomers = customers.filter(c => c.created_at?.startsWith(now.toISOString().split("T")[0]));
  const uniqueEmails = new Set(customers.map(c => c.email).filter(Boolean));

  return (
    <div>
      <SectionHeader title="Customers" action={<span style={{fontSize:12,color:C.sub}}>{customers.length} total · {uniqueEmails.size} with email</span>} />
      <MetricsRow>
        <MetricCard label="Total Customers" value={customers.length} />
        <MetricCard label="Added Today" value={todayCustomers.length} color={C.accent} />
        <MetricCard label="With Email" value={uniqueEmails.size} />
      </MetricsRow>
      <div style={{ marginTop: 16 }}>
        <AdminTable
          columns={[
            { key: "tailorName", label: "Tailor" },
            { key: "name", label: "Name" },
            { key: "phone", label: "Phone" },
            { key: "email", label: "Email" },
            { key: "created_at", label: "Added", render: (v) => v ? new Date(v).toLocaleDateString() : "—" },
          ]}
          rows={customers}
        />
      </div>
    </div>
  );
}
