"use client";
// src/components/boss/RemindersFlow.jsx
import { C, S } from "../tokens";
import { allOrders, getBalance, orderStatus, buildReminderMsg, waLink, invoiceUrl, fmt } from "../helpers";
import { useBOSS } from "../context";
import { Flow, Btn, EmptyState } from "../ui";
import { Events } from "@/lib/admin/events";

export function RemindersFlow({ open, onClose }) {
  const { customers, tailor, toast } = useBOSS();
  const shop = tailor?.shop || "BOSS Shop";
  const orders = allOrders(customers).filter(o => getBalance(o) > 0 && orderStatus(o) !== "Delivered");

  function send(o) {
    if (!o._cphone) { toast("⚠️ Customer has no phone number"); return; }
    const msg = buildReminderMsg(o, { name: o._cname, phone: o._cphone }, shop);
    window.open(waLink(o._cphone, msg), "_blank");
    Events.featureUse("reminder_send", { customerName: o._cname, orderId: o.id });
  }

  function copyLink(o) {
    const url = invoiceUrl(o.id);
    if (navigator.clipboard) { navigator.clipboard.writeText(url).then(() => toast("✅ Invoice link copied!")); }
    else { toast("Link: " + url); }
    Events.featureUse("reminder_copy_link", { orderId: o.id });
  }

  return (
    <Flow open={open} onClose={onClose} title="Send Reminders">
      {orders.length === 0
        ? <EmptyState icon="🎉" title="No unpaid balances!" sub="All orders are fully paid" />
        : orders.map(o => (
          <div key={o.id} style={{ ...S.card, display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontWeight: 700, fontSize: 15 }}>{o._cname}</div>
              <div style={{ fontWeight: 800, color: C.red }}>{fmt(getBalance(o))}</div>
            </div>
            <div style={{ fontSize: 13, color: C.sub }}>{o.type || "—"} · {o._cphone || "No phone"}</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
              {o._cphone ? (
                <a href={`tel:${o._cphone.replace(/[^\d+]/g, "")}`} className="tap" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "12px 0", borderRadius: 12, backgroundColor: C.s3, color: C.text, fontWeight: 700, fontSize: 13, textDecoration: "none", fontFamily: "inherit", minHeight: 48 }}>
                  📞
                </a>
              ) : (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "12px 0", borderRadius: 12, backgroundColor: C.s3, color: C.muted, fontWeight: 700, fontSize: 13, minHeight: 48, opacity: 0.4 }}>📞</div>
              )}
              <Btn variant="wa" onClick={() => send(o)} style={{ padding: "12px 0", fontSize: 13, textAlign: "center" }}>📲 WA</Btn>
              <Btn variant="outline" onClick={() => copyLink(o)} style={{ padding: "12px 0", fontSize: 13, textAlign: "center" }}>📋</Btn>
            </div>
          </div>
        ))}
    </Flow>
  );
}
