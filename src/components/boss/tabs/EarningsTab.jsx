"use client";
// src/components/boss/EarningsTab.jsx
import { useMemo, useState } from "react";
import { C, S } from "../tokens";
import { computeEarnings, allOrders, fmt } from "../helpers";
import { useBOSS } from "../context";
import { SectionLabel, EmptyState } from "../ui";

const PERIODS = [
  {k:"week", l:"This Week"},
  {k:"month", l:"This Month"},
  {k:"all", l:"All Time"},
];

export function EarningsTab() {
  const { customers } = useBOSS();
  const [period, setPeriod] = useState("month");
  const earnings = useMemo(() => computeEarnings(customers), [customers]);
  const { totalCollected, totalOwed, debtors, bestJob, worstJob, totalOrders, paidOrders } = earnings;
  const orders = useMemo(() => allOrders(customers), [customers]);

  const now = new Date();
  const filtered = useMemo(()=>{
    const startOfWeek = new Date(now); startOfWeek.setDate(now.getDate()-now.getDay()); startOfWeek.setHours(0,0,0,0);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    return orders.filter(o=>{
      if(period==="all") return true;
      const ts = o.createdAt || o.created_at;
      const d = ts ? new Date(ts) : null;
      if(!d) return false;
      const start = period==="week" ? startOfWeek : startOfMonth;
      return d >= start;
    });
  },[orders,period]);

  const periodCollected = filtered.reduce((s,o)=>s+(parseFloat(o.deposit)||0)+(parseFloat(o.paid)||0),0);
  const periodOwed = filtered.reduce((s,o)=>{const b=Math.max(0,(parseFloat(o.price)||0)-(parseFloat(o.deposit)||0)-(parseFloat(o.paid)||0));return s+b;},0);
  const periodDebtors = (()=>{
    const map={};
    filtered.forEach(o=>{
      const bal=Math.max(0,(parseFloat(o.price)||0)-(parseFloat(o.deposit)||0)-(parseFloat(o.paid)||0));
      if(bal<=0)return;
      const cid=o._cid||o.customer_id;
      const c=(customers||[]).find(x=>x.id===cid);
      if(!c)return;
      if(!map[c.id]) map[c.id]={name:c.name,owed:0};
      map[c.id].owed+=bal;
    });
    return Object.values(map).sort((a,b)=>b.owed-a.owed);
  })();

  const monthLabel = now.toLocaleString("default", { month: "long", year: "numeric" });

  return (
    <div className="scrollable" style={{ padding: 16, paddingBottom: 40 }}>
      <div style={{ fontSize: 30, fontWeight: 900, letterSpacing: "-1px", color: C.text, marginBottom: 20, display:"flex",alignItems:"center",justifyContent:"space-between" }}>
        <span>Earnings</span>
      </div>

      {/* Filter pills */}
      <div style={{display:"flex",gap:8,marginBottom:16}}>
        {PERIODS.map(({k,l})=>(
          <button key={k} className="tap" onClick={()=>setPeriod(k)} style={{
            ...S.pillBtn(period===k),fontFamily:"inherit",
          }}>{l}</button>
        ))}
      </div>

      {/* Card 1 — Money Collected */}
      <div style={{ background: C.s1, borderRadius: 20, padding: 20, marginBottom: 12 }}>
        <div style={{ fontSize: 13, color: C.sub, fontWeight: 600, marginBottom: 6 }}>Money Collected</div>
        <div style={{ fontSize: 36, fontWeight: 900, color: C.text, letterSpacing: "-1px" }}>{fmt(periodCollected)}</div>
        <div style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>
          {period==="all" ? "Total revenue from all orders" : period==="month" ? monthLabel : "This week"}
        </div>
      </div>

      {/* Card 2 — Still Owed */}
      <div style={{ background: C.s1, borderRadius: 20, padding: 20, marginBottom: 20 }}>
        <div style={{ fontSize: 13, color: C.sub, fontWeight: 600 }}>Still Owed to You</div>
        <div style={{ fontSize: 28, fontWeight: 800, color: periodOwed > 0 ? C.red : C.sub }}>{fmt(periodOwed)}</div>
        <div style={{ fontSize: 13, color: C.muted }}>
          {periodOwed > 0 ? `from ${periodDebtors.length} customer${periodDebtors.length === 1 ? "" : "s"}` : "You are all settled up 🎉"}
        </div>
      </div>

      {/* Debtors list */}
      {periodDebtors.length > 0 && (
        <>
          <SectionLabel>Who Owes You</SectionLabel>
          {periodDebtors.map(d => (
            <div key={d.name} style={{
              background: C.s2, borderRadius: 14, padding: "14px 16px", marginBottom: 8,
              display: "flex", justifyContent: "space-between", alignItems: "center"
            }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>{d.name}</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: C.red }}>{fmt(d.owed)}</div>
            </div>
          ))}
        </>
      )}

      {/* Best and Worst jobs */}
      {bestJob && worstJob && bestJob.type !== worstJob.type && (
        <>
          <SectionLabel>Your Jobs</SectionLabel>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div style={{ background: C.s1, borderRadius: 16, padding: 16 }}>
              <div style={{ fontSize: 13, color: C.sub, fontWeight: 700, marginBottom: 6, textTransform: "uppercase" }}>💪 Best Job</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: C.text, marginBottom: 4 }}>{bestJob.type}</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.accent }}>{fmt(bestJob.avg)}</div>
              <div style={{ fontSize: 13, color: C.muted }}>avg per order</div>
            </div>
            <div style={{ background: C.s1, borderRadius: 16, padding: 16 }}>
              <div style={{ fontSize: 13, color: C.sub, fontWeight: 700, marginBottom: 6, textTransform: "uppercase" }}>📉 Lowest Pay</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: C.text, marginBottom: 4 }}>{worstJob.type}</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.muted }}>{fmt(worstJob.avg)}</div>
              <div style={{ fontSize: 13, color: C.muted }}>avg per order</div>
            </div>
          </div>
        </>
      )}

      {/* Summary line */}
      <div style={{ fontSize: 13, color: C.muted, textAlign: "center", marginTop: 16 }}>
        {filtered.length} orders · {filtered.filter(o=>(parseFloat(o.deposit)||0)+(parseFloat(o.paid)||0)>=(parseFloat(o.price)||0)).length} fully paid
      </div>

      {/* All-time summary */}
      {period!=="all"&&(
        <div style={{fontSize:12,color:C.sub,textAlign:"center",marginTop:4}}>
          All time: {fmt(totalCollected)} collected · {totalOrders} orders
        </div>
      )}

      {/* Empty state */}
      {orders.length === 0 && (
        <EmptyState icon="💰" title="No earnings yet." sub="Add your first order to start tracking your money." />
      )}
    </div>
  );
}
