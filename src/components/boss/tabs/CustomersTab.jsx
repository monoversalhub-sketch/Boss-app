"use client";
// src/components/boss/CustomersTab.jsx
import { useState, useMemo, useEffect } from "react";
import { C, S } from "../tokens";
import { getBalance, fmt } from "../helpers";
import { useBOSS } from "../context";
import { EmptyState } from "../ui";
import { Events } from "@/lib/admin/events";

export function CustomersTab({ onOpenCustomer }) {
  const { customers } = useBOSS();
  const [q, setQ] = useState("");
  useEffect(()=>{Events.screenView("customers_tab");},[]);
  const list = useMemo(() =>
    customers
      .filter(c => !q || c.name.toLowerCase().includes(q.toLowerCase()) || (c.phone || "").includes(q))
      .sort((a, b) => a.name.localeCompare(b.name))
    , [customers, q]);
  return (
    <div style={{ background: C.bg }}>
      <div style={{ padding: "20px 24px 0" }}>
        <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.8px", color: C.text, marginBottom: 16 }}>Customers</div>
        <input value={q} onChange={e => setQ(e.target.value)} style={{ ...S.input }} placeholder="🔍  Search by name or phone…" type="search" autoComplete="off" />
      </div>
      <div style={{ padding: "12px 20px 0", display: "flex", flexDirection: "column", gap: 10 }}>
        {list.length === 0
          ? <EmptyState icon="👥" title="No customers yet." sub="Add your first order and your customer is saved automatically — measurements, deposits, and all." />
          : list.map(c => {
            const outstanding = (c.orders || []).reduce((s, o) => s + getBalance(o), 0);
            return (
              <div key={c.id} className="tap" onClick={() => onOpenCustomer(c.id)} style={{ ...S.card, display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ width: 48, height: 48, backgroundColor: C.dark, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 800, color: "#fff", flexShrink: 0 }}>{(c.name || "?")[0].toUpperCase()}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 15, color: C.text }}>{c.name}</div>
                  <div style={{ fontSize: 13, color: C.sub, marginTop: 1 }}>{(c.orders || []).length} order{(c.orders || []).length !== 1 ? "s" : ""} · {c.phone || "No phone"}</div>
                </div>
                {outstanding > 0 && <div style={{ fontSize: 13, fontWeight: 700, color: C.red, flexShrink: 0 }}>{fmt(outstanding)}</div>}
              </div>
            );
          })}
      </div>
      <div style={{ height: 100 }} />



    </div>
  );
}
