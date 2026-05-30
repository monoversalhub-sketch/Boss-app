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
      <Input label="Phone Number" value={phone} onChange={e => setPhone(e.target.value)} type="tel" inputMode="tel" placeholder="080XXXXXXXX" />
      <div>
        <label style={S.label}>Gender</label>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {["female", "male"].map(g => (
            <button key={g} className="tap" onClick={() => setGender(g)}
              style={{ padding: "13px", borderRadius: 14, border: `2px solid ${gender === g ? C.accent : C.border2}`, background: gender === g ? "rgba(0,102,204,0.06)" : C.s2, fontSize: 15, fontWeight: 700, color: gender === g ? C.accent : C.sub, cursor: "pointer", fontFamily: "inherit", textTransform: "capitalize" }}>
              {g === "female" ? "👩 Female" : "👨 Male"}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label style={S.label}>Measurements (inches) — optional</label>
        <MeasGrid measurements={meas} onChange={setMeas} />
      </div>
    </Flow>
  );
}
