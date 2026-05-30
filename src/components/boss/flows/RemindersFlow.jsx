"use client";
// src/components/boss/RemindersFlow.jsx
import { C, S } from "../tokens";
import { allOrders, getBalance, orderStatus, buildReminderMsg, waLink, invoiceUrl, fmt } from "../helpers";
import { useBOSS } from "../context";
import { Flow, Btn, EmptyState } from "../ui";

export function RemindersFlow({ open, onClose }) {
  const { customers, tailor, toast } = useBOSS();
  const shop = tailor?.shop || "BOSS Shop";
  const orders = allOrders(customers).filter(o => getBalance(o) > 0 && orderStatus(o) !== "Delivered");

  function send(o) {
    const msg = buildReminderMsg(o, { name: o._cname, phone: o._cphone }, shop);
    window.open(waLink(o._cphone, msg), "_blank");
  }

  function copyLink(o) {
    const url = invoiceUrl(o.id);
    if (navigator.clipboard) { navigator.clipboard.writeText(url).then(() => toast("✅ Invoice link copied!")); }
    else { toast("Link: " + url); }
  }

  return (
    <Flow open={open} onClose={onClose} title="Send Reminders">
      {orders.length === 0
        ? <EmptyState icon="🎉" title="No unpaid balances!" sub="All orders are fully paid" />
        : orders.map(o => (
          <div key={o.id} style={{ ...S.card, display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontWeight: 700, fontSize: 15 }}>{o._cname}</div>
              <div style={{ fontWeight: 800, color: C.red }}>{fmt(getBalance(o))}</div>
            </div>
            <div style={{ fontSize: 13, color: C.sub }}>{o.type || "—"} · {o._cphone || "No phone"}</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8 }}>
              <Btn variant="wa" onClick={() => send(o)}><span>📲</span> Remind + Send Link</Btn>
              <Btn variant="outline" onClick={() => copyLink(o)} style={{ width: "auto", padding: "12px 14px", fontSize: 13 }}>📋</Btn>
            </div>
          </div>
        ))}
    </Flow>
  );
}
