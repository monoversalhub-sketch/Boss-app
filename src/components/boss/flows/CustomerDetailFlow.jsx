"use client";
// src/components/boss/CustomerDetailFlow.jsx
import { useState, useEffect, useRef } from "react";
import { C, S } from "../tokens";
import { getBalance, fmt } from "../helpers";
import { useBOSS } from "../context";
import { Btn, Input, Flow, SectionLabel, EmptyState } from "../ui";
import { MeasGrid, OrderCard } from "../cards";
import { db } from "../../../lib/db";
import { Events } from "@/lib/admin/events";

export function CustomerDetailFlow({ open, onClose, customerId, onAddOrder, onOpenOrder }) {
  const { customers, setCustomers, toast, tailor, setTailor } = useBOSS();
  const customer = customers.find(c => c.id === customerId);

  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const saveEditRef = useRef(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (customer) { setEditName(customer.name || ""); setEditPhone(customer.phone || ""); }
  }, [customer?.id]);

  const measConfig = tailor?.meas_config || null;

  async function handleMeasConfigChange(config) {
    setTailor({ ...tailor, meas_config: config });
    await db.setTailor({ ...tailor, meas_config: config });
  }

  async function handleMeasUnitToggle(next) {
    setTailor({ ...tailor, meas_unit: next });
    await db.setTailor({ ...tailor, meas_unit: next });
    toast(`📏 Switched to ${next}`);
  }

  if (!customer) return null;

  const orders = customer.orders || [];
  const totalSpent = orders.reduce((s, o) => s + (parseFloat(o.deposit) || 0) + (parseFloat(o.paid) || 0), 0);
  const outstanding = orders.reduce((s, o) => s + getBalance(o), 0);

  async function saveEdit() {
    if (saveEditRef.current) return;
    if (!editName.trim()) { toast("⚠️ Name cannot be empty"); return; }
    saveEditRef.current = true; setSaving(true);
    try {
      const patch = { name: editName.trim(), phone: editPhone.trim() };
      const next = customers.map(c => c.id === customerId ? { ...c, ...patch } : c);
      setCustomers(next);
      await db.updateCustomer(customerId, patch);
      setEditing(false);
      toast("✅ Customer updated");
    } catch (e) {
      console.error("[CustomerDetailFlow saveEdit]", e);
      toast("❌ Update failed. Try again.");
    } finally {
      saveEditRef.current = false; setSaving(false);
    }
  }

  async function deleteCustomer() {
    setDeleting(true);
    const next = customers.filter(c => c.id !== customerId);
    setCustomers(next);
    await db.deleteCustomer(customerId);
    setDeleting(false); setConfirmDel(false);
    onClose(); toast("Customer deleted");
  }

  async function updateMeas(meas) {
    const next = customers.map(c => c.id === customerId ? { ...c, measurements: meas } : c);
    setCustomers(next);
    await db.updateCustomer(customerId, { measurements: meas });
  }

  const Row = ({ label, value, valueStyle = {} }) => (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "11px 0", borderBottom: `1px solid ${C.border}` }}>
      <div style={{ fontSize: 13, color: C.sub }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 700, ...valueStyle }}>{value}</div>
    </div>
  );

  return (
    <>
      <Flow
        open={open}
        onClose={onClose}
        title={editing ? "Edit Customer" : customer.name}
        action={editing ? (saving ? "Saving…" : "Save") : null}
        onAction={editing ? (saving ? undefined : saveEdit) : null}
      >
        {editing ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <Input label="Customer Name *" value={editName} onChange={e => setEditName(e.target.value)} placeholder="Full name" />
            <Input label="Phone Number" value={editPhone} onChange={e => setEditPhone(e.target.value)} type="tel" inputMode="tel" placeholder="080XXXXXXXX" />
            <Btn variant="primary" onClick={saveEdit} disabled={saving}>{saving ? "Saving…" : "Save Changes"}</Btn>
            <Btn variant="outline" onClick={() => setEditing(false)}>Cancel</Btn>
          </div>
        ) : (
          <>
            <div style={S.card}>
              <Row label="Phone" value={<span style={{display:"inline-flex",alignItems:"center",gap:8}}>{customer.phone || "—"}{customer.phone&&<a href={`tel:${customer.phone.replace(/[^\d+]/g,"")}`} className="tap" style={{fontSize:12,fontWeight:800,color:C.accent,textDecoration:"none"}}>📞</a>}</span>} valueStyle={{ color: C.accent }} />
              <Row label="Total Orders" value={orders.length} />
              <Row label="Total Spent" value={fmt(totalSpent)} />
              <Row label="Outstanding" value={fmt(outstanding)} valueStyle={{ color: outstanding > 0 ? C.red : C.green }} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <Btn variant="outline" onClick={() => setEditing(true)}>✏️ Edit Details</Btn>
              <Btn variant="danger" onClick={() => setConfirmDel(true)}>🗑️ Delete</Btn>
            </div>

            <div>
              <SectionLabel style={{ padding: 0, marginTop: 0, marginBottom: 12 }}>Saved Measurements</SectionLabel>
              <MeasGrid
                measurements={customer.measurements || {}}
                onChange={m => { updateMeas(m); toast("✅ Saved"); }}
                gender={customer.gender}
                measConfig={measConfig}
                onConfigChange={handleMeasConfigChange}
                unit={tailor?.meas_unit || "inches"}
                onUnitToggle={handleMeasUnitToggle}
              />
            </div>

            <div>
              <SectionLabel style={{ padding: 0, marginTop: 0, marginBottom: 12 }}>Order History</SectionLabel>
              {orders.length === 0
                ? <EmptyState icon="📋" title="No orders yet" sub="Tap + Order to create the first one." />
                : [...orders].reverse().map(o => (
                  <div key={o.id} style={{ marginBottom: 10 }}>
                    <OrderCard order={{ ...o, _cname: customer.name, _cphone: customer.phone }} onClick={() => onOpenOrder(o.id)} />
                  </div>
                ))
              }
            </div>
          </>
        )}
      </Flow>

      {confirmDel && (
        <div style={{ position: "fixed", inset: 0, zIndex: 500, display: "flex", alignItems: "flex-end" }}>
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)" }} onClick={() => setConfirmDel(false)} />
          <div className="anim-slide" style={{ position: "relative", zIndex: 1, background: C.s1, borderRadius: "28px 28px 0 0", padding: "24px 20px 48px", width: "100%" }}>
            <div style={{ width: 40, height: 4, background: C.s3, borderRadius: 4, margin: "0 auto 20px" }} />
            <div style={{ fontSize: 18, fontWeight: 800, color: C.text, marginBottom: 8 }}>Delete {customer.name}?</div>
            <div style={{ fontSize: 13, color: C.sub, lineHeight: 1.7, marginBottom: 20 }}>
              This will permanently delete <strong>{customer.name}</strong> and all <strong>{orders.length} order{orders.length !== 1 ? "s" : ""}</strong> linked to them. This cannot be undone.
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <Btn variant="danger" onClick={deleteCustomer} disabled={deleting}>{deleting ? "Deleting…" : "Yes, Delete Customer & All Orders"}</Btn>
              <Btn variant="outline" onClick={() => setConfirmDel(false)}>Cancel — Keep Customer</Btn>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
