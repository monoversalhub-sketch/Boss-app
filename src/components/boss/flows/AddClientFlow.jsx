"use client";
// src/components/boss/AddClientFlow.jsx
import { useState, useEffect, useRef } from "react";
import { C, S } from "../tokens";
import { uid } from "../helpers";
import { useBOSS } from "../context";
import { Flow, Input } from "../ui";
import { MeasGrid } from "../cards";
import { db } from "../../../lib/db";

export function AddClientFlow({ open, onClose, onDone }) {
  const { customers, setCustomers, toast } = useBOSS();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [gender, setGender] = useState("female");
  const [meas, setMeas] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const savingRef = useRef(false);

  useEffect(() => { if (open) { setName(""); setPhone(""); setGender("female"); setMeas({}); setIsSaving(false); savingRef.current = false; } }, [open]);

  async function save() {
    if (savingRef.current) return;
    if (!name.trim()) { toast("⚠️ Enter client name"); return; }
    savingRef.current = true; setIsSaving(true);
    try {
      const c = { id: uid(), name: name.trim(), phone: phone.trim(), gender, measurements: meas, orders: [], createdAt: new Date().toISOString() };
      const next = [c, ...customers];
      setCustomers(next);
      const tailorId = await db.getTailorId();
      if (tailorId) {
        const r = await db.addCustomer(c, tailorId);
        if (!r.ok) toast("⚠️ Client saved locally — sync failed. Check connection.");
      } else {
        toast("⚠️ Client saved locally — not signed in.");
      }
      toast("✅ Client saved!"); onDone(c.id);
    } catch (e) {
      console.error("[AddClientFlow save]", e);
      toast("❌ Could not save. Try again.");
    } finally {
      savingRef.current = false; setIsSaving(false);
    }
  }

  return (
    <Flow open={open} onClose={onClose} title="New Client" action={isSaving ? "Saving…" : "Save"} onAction={isSaving ? undefined : save}>
      <Input label="Full Name *" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Amaka Johnson" autoComplete="off" />
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: C.sub, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 10 }}>Gender</div>
        <div style={{ display: "flex", gap: 10 }}>
          {[["female","👗","Female"],["male","👔","Male"]].map(([val,icon,label]) => (
            <button key={val} type="button" onClick={() => setGender(val)}
              style={{ flex: 1, padding: "14px 0", borderRadius: 14, border: gender === val ? `2px solid ${C.accent}` : `1px solid ${C.border}`, background: gender === val ? `${C.accent}18` : C.s2, color: gender === val ? C.accent : C.sub, fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, transition: "all 0.15s" }}>
              <span style={{ fontSize: 18 }}>{icon}</span>{label}
            </button>
          ))}
        </div>
      </div>
      <Input label="Phone Number" value={phone} onChange={e => setPhone(e.target.value)} type="tel" inputMode="tel" placeholder="080XXXXXXXX" />
      <div>
        <label style={S.label}>Measurements (inches) — optional</label>
        <MeasGrid measurements={meas} onChange={setMeas} gender={gender} />
      </div>
    </Flow>
  );
}
