"use client";
import { useState, useEffect, useCallback } from "react";
import { AdminC as C, AdminS as S, SectionHeader, AdminTable, StatusBadge, ScoreBar } from "@/components/admin/Layout";

export default function UsersPage() {
  const [tailors, setTailors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    const { getBrowserClient } = await import("@/lib/db");
    const client = await getBrowserClient();
    const { data } = await client.from("tailors")
      .select("id, name, email, phone, bos_score, created_at, last_active_at")
      .order("created_at", { ascending: false });
    setTailors(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = tailors.filter(t =>
    !search || t.name?.toLowerCase().includes(search.toLowerCase()) ||
    t.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <SectionHeader title="Users" action={
        <div style={{ display: "flex", gap: 8 }}>
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search users..."
            style={{
              ...S.input, padding: "8px 14px", fontSize: 13,
              backgroundColor: C.s2, border: `1px solid ${C.border}`,
              borderRadius: 8, width: 240,
            }}
          />
          <span style={{ fontSize: 12, color: C.sub, display: "flex", alignItems: "center" }}>
            {filtered.length} users
          </span>
        </div>
      } />
      <AdminTable
        columns={[
          { key: "name", label: "Name" },
          { key: "email", label: "Email" },
          { key: "phone", label: "Phone" },
          { key: "bos_score", label: "Trust Score", render: (v) => <ScoreBar score={v || 0} showLabel height={6} /> },
          { key: "total_orders", label: "Orders", align: "right" },
          { key: "created_at", label: "Joined", render: (v) => v ? new Date(v).toLocaleDateString() : "—" },
          { key: "last_active_at", label: "Active", render: (v) => v
            ? Math.floor((new Date() - new Date(v)) / 86400000) + "d ago"
            : "Never",
          },
        ]}
        rows={filtered.map(t => ({ ...t, total_orders: "?" }))}
      />
    </div>
  );
}
