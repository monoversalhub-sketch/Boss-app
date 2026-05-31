"use client";
// src/components/boss/EarningsTab.jsx
import { useMemo } from "react";
import { C } from "../tokens";
import { computeEarnings, allOrders, fmt } from "../helpers";
import { useBOSS } from "../context";
import { SectionLabel, EmptyState } from "../ui";

export function EarningsTab() {
  const { customers } = useBOSS();
  const earnings = useMemo(() => computeEarnings(customers), [customers]);
  const { totalCollected, totalOwed, debtors, thisMonth, bestJob, worstJob, totalOrders, paidOrders } = earnings;
  const orders = useMemo(() => allOrders(customers), [customers]);

  const now = new Date();
  const monthLabel = now.toLocaleString("default", { month: "long", year: "numeric" });

  return (
    <div className="scrollable" style={{ padding: 16, paddingBottom: 40 }}>
      <div style={{ fontSize: 30, fontWeight: 900, letterSpacing: "-1px", color: C.text, marginBottom: 20 }}>
        Earnings
      </div>

      {/* Card 1 — Money Collected */}
      <div style={{ background: C.s1, borderRadius: 20, padding: 20, marginBottom: 12 }}>
        <div style={{ fontSize: 13, color: C.sub, fontWeight: 600, marginBottom: 6 }}>Money Collected</div>
        <div style={{ fontSize: 36, fontWeight: 900, color: C.text, letterSpacing: "-1px" }}>{fmt(totalCollected)}</div>
        <div style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>Your total revenue from all orders</div>
      </div>

      {/* Card 2 — This Month */}
      <div style={{ background: C.s1, borderRadius: 20, padding: 20, marginBottom: 12 }}>
        <div style={{ fontSize: 13, color: C.sub, fontWeight: 600 }}>Collected This Month</div>
        <div style={{ fontSize: 28, fontWeight: 800, color: C.text }}>{fmt(thisMonth)}</div>
        <div style={{ fontSize: 13, color: C.muted }}>{monthLabel}</div>
      </div>

      {/* Card 3 — Still Owed */}
      <div style={{ background: C.s1, borderRadius: 20, padding: 20, marginBottom: 20 }}>
        <div style={{ fontSize: 13, color: C.sub, fontWeight: 600 }}>Still Owed to You</div>
        <div style={{ fontSize: 28, fontWeight: 800, color: totalOwed > 0 ? C.red : C.sub }}>{fmt(totalOwed)}</div>
        <div style={{ fontSize: 13, color: C.muted }}>
          {totalOwed > 0 ? `from ${debtors.length} customer${debtors.length === 1 ? "" : "s"}` : "You are all settled up 🎉"}
        </div>
      </div>

      {/* Debtors list */}
      {debtors.length > 0 && (
        <>
          <SectionLabel>Who Owes You</SectionLabel>
          {debtors.map(d => (
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
        {totalOrders} orders total · {paidOrders} fully paid
      </div>

      {/* Empty state */}
      {orders.length === 0 && (
        <EmptyState icon="💰" title="No earnings yet." sub="Add your first order to start tracking your money." />
      )}
    </div>
  );
}
