"use client";
// src/components/boss/flows/AddOrderFlow.jsx
import { useState, useEffect, useMemo, useRef } from "react";
import { C, S, CLOTH_TYPES } from "../tokens";
import { uid, fmt, waLink, buildReceiptText } from "../helpers";
import { useBOSS } from "../context";
import { Btn, Input, Select, Textarea, Flow, DatePicker } from "../ui";
import { SmartPricingCalculator } from "../SmartPricingCalculator";
import { db } from "../../../lib/db";

export function AddOrderFlow({ open, onClose, prefilledCid }) {
  const { customers, setCustomers, toast, tailor } = useBOSS();
  const pre = customers.find(c => c.id === prefilledCid);
  const [name, setName] = useState(pre?.name || ""); const [phone, setPhone] = useState(pre?.phone || "");
  const [type, setType] = useState(""); const [price, setPrice] = useState("");
  const [deposit, setDeposit] = useState(""); const [date, setDate] = useState("");
  const [notes, setNotes] = useState(""); const [matches, setMatches] = useState([]);
  const [showCalc, setShowCalc] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const savingRef = useRef(false);
  const [receiptPrompt, setReceiptPrompt] = useState(null);

  useEffect(() => {
    if (open) { const p = customers.find(c => c.id === prefilledCid);
      setName(p?.name || ""); setPhone(p?.phone || ""); setType(""); setPrice(""); setDeposit(""); setDate(""); setNotes(""); setMatches([]); setShowCalc(false); setIsSaving(false); savingRef.current = false; }
  }, [open, prefilledCid]);

  function onNameChange(v) { setName(v); if (v.length < 1) { setMatches([]); return; } setMatches(customers.filter(c => c.name.toLowerCase().includes(v.toLowerCase())).slice(0, 5)); }
  function pickExisting(c) { setName(c.name); setPhone(c.phone || ""); setMatches([]); }

  async function save() {
    if (savingRef.current) return;
    if (!name.trim()) { toast("⚠️ Enter customer name"); return; }
    if (!date) { toast("⚠️ Set a delivery date"); return; }
    savingRef.current = true; setIsSaving(true);
    try {
      const order = { id: uid(), type, price: parseFloat(price) || 0, deposit: parseFloat(deposit) || 0, paid: 0, date, notes, status: "In Progress", createdAt: new Date().toISOString() };
      const next = [...customers];
      let cust = next.find(c => c.id === prefilledCid) || next.find(c => c.name.toLowerCase() === name.trim().toLowerCase());
      const isNewCustomer = !cust;
      if (isNewCustomer) { cust = { id: uid(), name: name.trim(), phone: phone.trim(), measurements: {}, orders: [] }; next.push(cust); }
      else { if (phone.trim()) cust.phone = phone.trim(); }
      cust.orders = [order, ...(cust.orders || [])];
      setCustomers(next);
      let tailorId = null;
      for (let i = 0; i < 3; i++) {
        tailorId = await db.getTailorId();
        if (tailorId) break;
        await new Promise(r => setTimeout(r, 800));
      }
      if (tailorId) {
        let ok = true;
        if (isNewCustomer) { const r = await db.addCustomer(cust, tailorId); if (!r.ok) { ok = false; console.error("[AddOrderFlow] addCustomer failed", r.error); } }
        else if (phone.trim()) { await db.updateCustomer(cust.id, { phone: phone.trim() }); }
        if (ok) { const r = await db.addOrder(order, cust.id, tailorId); if (!r.ok) { ok = false; console.error("[AddOrderFlow] addOrder failed", r.error); } }
        if (!ok) toast("⚠️ Saved locally — sync failed. Check connection.");
      } else { toast("⚠️ Saved locally — not signed in."); }

      const hasPaid = (parseFloat(deposit) || 0) > 0;
      const hasPhone = !!(cust.phone || "").trim();
      if (hasPaid && hasPhone) { setReceiptPrompt({ order, customer: { ...cust } }); }
      else { onClose(); toast("✅ Order saved!"); }
    } catch (e) {
      console.error("[AddOrderFlow save]", e);
      toast("❌ Could not save. Try again.");
    } finally {
      savingRef.current = false; setIsSaving(false);
    }
  }

  function sendReceipt() {
    if (!receiptPrompt) return;
    const { order, customer } = receiptPrompt;
    const shop = tailor?.shop || "BOSS Shop";
    const msg = buildReceiptText(order, customer, shop, null);
    window.open(waLink(customer.phone, msg), "_blank");
    setReceiptPrompt(null);
    onClose(); toast("✅ Order saved + receipt sent!");
  }

  function skipReceipt() {
    setReceiptPrompt(null);
    onClose(); toast("✅ Order saved!");
  }

  const progress = useMemo(() => {
    const fields = [
      !!name.trim(),
      !!phone.trim(),
      !!type,
      !!(price),
      !!date,
    ];
    return Math.round((fields.filter(Boolean).length / fields.length) * 100);
  }, [name, phone, type, price, date]);

  return (
    <>
      <Flow open={open} onClose={onClose} title="New Order" action={isSaving ? "Saving…" : "Save"} onAction={isSaving ? undefined : save}>
        <div style={{ marginBottom: 4 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: C.sub }}>Form progress</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: progress === 100 ? C.green : C.accent }}>{progress}%</span>
          </div>
          <div style={{ height: 4, background: C.s3, borderRadius: 4, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${progress}%`, borderRadius: 4, background: progress === 100 ? C.green : C.accent, transition: "width 0.3s ease" }} />
          </div>
        </div>
        <div style={{ position: "relative" }}>
          <Input label="Search or Add Customer *" value={name} onChange={e => onNameChange(e.target.value)} placeholder="Type name to search or add new…" autoComplete="off" />
          {name.length >= 1 && matches.length === 0 && customers.length > 0 && (
            <div style={{ fontSize: 12, color: C.sub, padding: "5px 4px", fontWeight: 500 }}>No match — a new customer will be created</div>
          )}
          {matches.length > 0 && (
            <div style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 200, background: C.s1, border: `1px solid ${C.border}`, borderRadius: 14, overflow: "hidden", boxShadow: "0 8px 24px rgba(0,0,0,0.1)", marginTop: 4 }}>
              <div style={{ padding: "8px 14px 4px", fontSize: 10, fontWeight: 700, color: C.sub, textTransform: "uppercase", letterSpacing: "0.5px" }}>Existing Customers</div>
              {matches.map(c => (
                <div key={c.id} className="tap" onMouseDown={() => pickExisting(c)}
                  style={{ padding: "12px 14px", borderTop: `1px solid ${C.border}`, cursor: "pointer", display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: C.s3, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 800, color: C.text, flexShrink: 0 }}>{c.name[0].toUpperCase()}</div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: C.text }}>{c.name}</div>
                    <div style={{ fontSize: 12, color: C.sub, marginTop: 1 }}>{c.phone || "No phone"} · {(c.orders || []).length} order{(c.orders || []).length !== 1 ? "s" : ""}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <Input label="Phone Number" value={phone} onChange={e => setPhone(e.target.value)} type="tel" inputMode="tel" placeholder="080XXXXXXXX" />
        <Select label="Cloth Type / Style" value={type} onChange={e => setType(e.target.value)} options={[{ value: "", label: "Select type…" }, ...CLOTH_TYPES]} />

        <div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Input label="Total Price (₦)" value={price} onChange={e => setPrice(e.target.value)} type="number" inputMode="numeric" placeholder="0" />
            <Input label="Deposit Paid (₦)" value={deposit} onChange={e => setDeposit(e.target.value)} type="number" inputMode="numeric" placeholder="0" />
          </div>
          <button className="tap" onClick={() => setShowCalc(v => !v)}
            style={{ marginTop: 8, background: showCalc ? "rgba(0,102,204,0.1)" : C.s3, border: `1px solid ${showCalc ? "rgba(0,102,204,0.3)" : C.border}`, borderRadius: 10, padding: "10px 14px", fontSize: 13, fontWeight: 700, color: showCalc ? C.accent : C.sub, cursor: "pointer", width: "100%", fontFamily: "inherit" }}>
            {showCalc ? "▲ Close Calculator" : "🧮 Use Smart Pricing Calculator"}
          </button>
          {showCalc && (
            <div style={{ marginTop: 10, background: C.s2, borderRadius: 16, padding: 16 }}>
              <SmartPricingCalculator onUsePrice={p => { setPrice(String(Math.round(p))); setShowCalc(false); toast(`✅ Price set to ${fmt(p)}`); }} />
            </div>
          )}
        </div>

        <DatePicker label="Delivery Date *" value={date} onChange={setDate} />
        <Textarea label="Notes" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Style details, fabric colour, special requests…" />
      </Flow>

      {receiptPrompt && (
        <div style={{ position: "fixed", inset: 0, zIndex: 500, display: "flex", alignItems: "flex-end" }}>
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)" }} onClick={skipReceipt} />
          <div className="anim-slide" style={{ position: "relative", zIndex: 1, background: C.s1, borderRadius: "32px 32px 0 0", padding: "28px 24px 48px", width: "100%" }}>
            <div style={{ fontSize: 24, marginBottom: 8, textAlign: "center" }}>🧾</div>
            <div style={{ fontSize: 19, fontWeight: 900, color: C.text, marginBottom: 8, textAlign: "center" }}>
              Send receipt to {receiptPrompt.customer.name}?
            </div>
            <div style={{ fontSize: 14, color: C.sub, lineHeight: 1.6, marginBottom: 24, textAlign: "center" }}>
              A professional WhatsApp receipt with their order details and your payment account. One tap — they get it instantly.
            </div>
            <Btn variant="wa" onClick={sendReceipt} style={{ marginBottom: 12 }}><span>💬</span> Send on WhatsApp</Btn>
            <Btn variant="outline" onClick={skipReceipt}>Skip for now</Btn>
          </div>
        </div>
      )}
    </>
  );
}
