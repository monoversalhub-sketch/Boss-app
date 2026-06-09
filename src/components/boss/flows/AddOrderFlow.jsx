"use client";
// src/components/boss/flows/AddOrderFlow.jsx
import { useState, useEffect, useRef } from "react";
import { C, S, CLOTH_TYPES, MEAS_FIELDS } from "../tokens";
import { uid, fmt, vibrate, invoiceUrl } from "../helpers";
import { useBOSS } from "../context";
import { Btn, Input, Select, Textarea, Flow, DatePicker, SectionLabel } from "../ui";
import { SmartPricingCalculator } from "../SmartPricingCalculator";
import { MeasGrid } from "../cards";
import { VoiceNote } from "../VoiceNote";
import { db } from "../../../lib/db";
import { feedback } from "../../../lib/feedback";
import { referral } from "../../../lib/referral";

const STEP_LABELS = ["Customer", "Payment", "Delivery & Fit", "Review"];

export function AddOrderFlow({ open, onClose, prefilledCid, onFeedbackTrigger }) {
  const { customers, setCustomers, toast, tailor } = useBOSS();
  const pre = customers.find(c => c.id === prefilledCid);
  const [step, setStep] = useState(1);
  const [name, setName] = useState(pre?.name || ""); const [phone, setPhone] = useState(pre?.phone || "");
  const [type, setType] = useState(""); const [price, setPrice] = useState("");
  const [deposit, setDeposit] = useState(""); const [date, setDate] = useState("");
  const [notes, setNotes] = useState(""); const [matches, setMatches] = useState([]);
  const [showCalc, setShowCalc] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const savingRef = useRef(false);
  const [receiptPrompt, setReceiptPrompt] = useState(null);
  const [selectedImages, setSelectedImages] = useState([]);
  const [activeShortcut, setActiveShortcut] = useState(null);
  const fileInputRef = useRef(null);
  const [meas, setMeas] = useState({});
  const [measOpen, setMeasOpen] = useState(false);
  const [voiceBlob, setVoiceBlob] = useState(null);

  useEffect(() => {
    if (open) { const p = customers.find(c => c.id === prefilledCid);
      setName(p?.name || ""); setPhone(p?.phone || ""); setType(""); setPrice(""); setDeposit(""); setDate(""); setNotes(""); setMatches([]); setShowCalc(false); setIsSaving(false); savingRef.current = false;
      setMeas({}); setMeasOpen(false); setStep(1); setVoiceBlob(null);
      setSelectedImages(prev => { prev.forEach(i => URL.revokeObjectURL(i.url)); return []; }); }
    return () => setSelectedImages(prev => { prev.forEach(i => URL.revokeObjectURL(i.url)); return []; });
  }, [open, prefilledCid]);

  function onNameChange(v) { setName(v); if (v.length < 1) { setMatches([]); return; } setMatches(customers.filter(c => c.name.toLowerCase().includes(v.toLowerCase())).slice(0, 5)); }
  function pickExisting(c) { setName(c.name); setPhone(c.phone || ""); setMatches([]); }

  function handleImageSelect(e) {
    const files = Array.from(e.target.files || []);
    const remaining = 5 - selectedImages.length;
    const newItems = files.slice(0, remaining).map(file => ({ file, url: URL.createObjectURL(file) }));
    setSelectedImages(prev => [...prev, ...newItems].slice(0, 5));
    e.target.value = "";
  }

  function removeSelectedImage(index) {
    setSelectedImages(prev => {
      const img = prev[index];
      if (img) URL.revokeObjectURL(img.url);
      return prev.filter((_, i) => i !== index);
    });
  }

  async function save() {
    if (savingRef.current) return;
    if (!name.trim()) { toast("⚠️ Please add a customer name to continue"); return; }
    if (!date) { toast("⚠️ When do you need to deliver this? Add a date."); return; }
    savingRef.current = true; setIsSaving(true);
    try {
      const order = { id: uid(), type, price: parseFloat(stripCommas(price)) || 0, deposit: parseFloat(stripCommas(deposit)) || 0, paid: 0, date, notes, status: "In Progress", createdAt: new Date().toISOString() };
      const next = [...customers];
      let cust = next.find(c => c.id === prefilledCid) || next.find(c => c.name.toLowerCase() === name.trim().toLowerCase());
      const isNewCustomer = !cust;
      if (isNewCustomer) { cust = { id: uid(), name: name.trim(), phone: phone.trim(), measurements: meas, orders: [] }; next.push(cust); }
      else { if (phone.trim()) cust.phone = phone.trim(); if (Object.keys(meas).length) cust.measurements = { ...(cust.measurements||{}), ...meas }; }
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
        if (!ok) toast("⚠️ Saved on your phone. Will update online when network is back.");
      } else { toast("⚠️ Saved on this phone. Sign in to back up your data safely."); }

      if (tailorId && selectedImages.length > 0) {
        const urls = await db.uploadOrderImages(tailorId, order.id, selectedImages.map(i => i.file));
        if (urls.length > 0) {
          order.imageUrls = urls;
          await db.updateOrder(order.id, { imageUrls: urls });
          for (const c of next) {
            const o = (c.orders || []).find(x => x.id === order.id);
            if (o) { o.imageUrls = urls; break; }
          }
          setCustomers([...next]);
        }
      }

      if (tailorId && voiceBlob) {
        const voiceUrl = await db.uploadVoiceNote(tailorId, order.id, voiceBlob);
        if (voiceUrl) {
          order.voiceNoteUrl = voiceUrl;
          await db.updateOrder(order.id, { voiceNoteUrl: voiceUrl });
          for (const c of next) {
            const o = (c.orders || []).find(x => x.id === order.id);
            if (o) { o.voiceNoteUrl = voiceUrl; break; }
          }
          setCustomers([...next]);
        }
      }

      const totalOrders = next.reduce((sum, c) => sum + (c.orders || []).length, 0);
      if (totalOrders === 5 && feedback.shouldShowMicro("micro_5th_order")) {
        feedback.markMicroShown("micro_5th_order");
        onFeedbackTrigger?.("5th_order");
      }

      if (tailorId) {
        await referral.checkActivation(tailorId, totalOrders);
      }

      if (tailor?.google_drive_refresh_token) {
        fetch("/api/calendar/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId: order.id, customerId: cust.id, action: "create" }),
        }).then(r => r.json()).then(d => {
          if (d.ok) toast("📅 Added to your Google Calendar with 3-day reminder");
        }).catch(e => console.error("[calendar] create failed", e));
      }

      const hasPaid = (parseFloat(stripCommas(deposit)) || 0) > 0;
      const hasPhone = !!(cust.phone || "").trim();
      if (hasPaid && hasPhone) {
        vibrate(8);
        toast("✅ Order saved!");
        setReceiptPrompt({ order, customer: { ...cust } });
      }
      else { vibrate(8); onClose(); toast("✅ Order saved!"); }
    } catch (e) {
      console.error("[AddOrderFlow save]", e);
      toast("❌ Something went wrong. Your data is safe — try again.");
    } finally {
      savingRef.current = false; setIsSaving(false);
    }
  }

  function stripCommas(v){return v.replace(/,/g,"");}
  function fmtPrice(v){const n=parseFloat(stripCommas(v));return isNaN(n)?"":n.toLocaleString("en-US");}
  function applyDateShortcut(days){const d=new Date();d.setDate(d.getDate()+days);const y=d.getFullYear();const m=String(d.getMonth()+1).padStart(2,"0");const dd=String(d.getDate()).padStart(2,"0");setDate(`${y}-${m}-${dd}`);setActiveShortcut(days);}
  function handleDateChange(val){setActiveShortcut(null);setDate(val);}
  const dateError = date && date < new Date().toISOString().slice(0, 10) ? "⚠️ Delivery date is in the past" : "";
  const depositWarn = price && deposit && parseFloat(stripCommas(deposit)) > parseFloat(stripCommas(price))
    ? "⚠️ Deposit exceeds total price" : "";

  const STEPS = [
    { num: 1, label: "Customer" },
    { num: 2, label: "Payment" },
    { num: 3, label: "Delivery & Fit" },
    { num: 4, label: "Review" },
  ];

  function canAdvance() {
    if (step === 1) return !!name.trim();
    if (step === 2) return true;
    if (step === 3) return !!date && date >= new Date().toISOString().slice(0, 10);
    return true;
  }

  function nextStep() {
    if (!canAdvance()) { toast("⚠️ Please fill the required fields first"); return; }
    setStep(s => Math.min(4, s + 1));
  }

  function prevStep() { setStep(s => Math.max(1, s - 1)); }

  return (
    <>
      <Flow open={open} onClose={onClose} title="New Order"
        action={step === 4 ? (isSaving ? "Saving…" : "Save") : "Next →"}
        onAction={step === 4 ? (isSaving ? undefined : save) : nextStep}>

        {/* Step indicator */}
        <div style={{ display: "flex", gap: 4, marginBottom: 20 }}>
          {STEPS.map(s => (
            <div key={s.num} style={{
              flex: 1, height: 4, borderRadius: 2,
              backgroundColor: step >= s.num ? C.accent : C.s3,
              transition: "background-color 0.3s",
            }} />
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
          {STEPS.map(s => (
            <div key={s.num} style={{
              fontSize: 11, fontWeight: 700, color: step === s.num ? C.accent : C.muted,
              textTransform: "uppercase", letterSpacing: "0.5px",
            }}>
              {s.label}
            </div>
          ))}
        </div>

        {/* ── Step 1: Customer ── */}
        {step === 1 && (
          <>
            <div style={{ position: "relative" }}>
              <Input label="Customer Name" value={name} onChange={e => onNameChange(e.target.value)} placeholder="Type name to search or add new…" autoComplete="off" />
              {!name.trim() && <div style={{ fontSize: 13, color: C.sub, padding: "4px 4px 0" }}>Type to search existing customers or add a new one</div>}
              {name.length >= 1 && matches.length === 0 && customers.length > 0 && (
                <div style={{ fontSize: 13, color: C.sub, padding: "5px 4px", fontWeight: 500 }}>No match — a new customer will be created</div>
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
                        <div style={{ fontSize: 13, color: C.sub, marginTop: 1 }}>{c.phone || "No phone"} · {(c.orders || []).length} order{(c.orders || []).length !== 1 ? "s" : ""}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <Input label="Phone Number" value={phone} onChange={e => setPhone(e.target.value)} type="tel" inputMode="tel" placeholder="080XXXXXXXX" />
            <Select label="Cloth Type / Style" value={type} onChange={e => setType(e.target.value)} options={[{ value: "", label: "Select type…" }, ...CLOTH_TYPES]} />
          </>
        )}

        {/* ── Step 2: Payment ── */}
        {step === 2 && (
          <>
            <div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <Input label="Total Price (₦)" value={price} onChange={e => setPrice(e.target.value)} type="text" inputMode="numeric" placeholder="0" onFocus={e => setPrice(stripCommas(e.target.value))} onBlur={e => setPrice(fmtPrice(e.target.value))} />
                <Input label="Deposit Paid (₦)" value={deposit} onChange={e => setDeposit(e.target.value)} type="text" inputMode="numeric" placeholder="0" onFocus={e => setDeposit(stripCommas(e.target.value))} onBlur={e => setDeposit(fmtPrice(e.target.value))} />
              </div>
              {depositWarn && <div style={{fontSize:12,color:C.red,marginTop:4}}>{depositWarn}</div>}
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
          </>
        )}

        {/* ── Step 3: Delivery & Fit ── */}
        {step === 3 && (
          <>
            <DatePicker label="Delivery Date *" value={date} onChange={handleDateChange} />
            {dateError && <div style={{fontSize:12,color:C.red,marginTop:4}}>{dateError}</div>}
            <div style={{display:"flex",gap:8,overflowX:"auto",scrollbarWidth:"none",WebkitOverflowScrolling:"touch",marginTop:8}}>
              {[[1,"Tomorrow"],[7,"1 Week"],[14,"2 Weeks"]].map(([d,l])=>{
                const active=activeShortcut===d;
                return(
                  <button key={d} className="tap" onClick={()=>applyDateShortcut(d)}
                    style={{padding:"9px 16px",borderRadius:10,fontSize:13,fontWeight:active?700:500,border:"none",background:active?C.accent:C.s3,color:active?"#fff":C.text,cursor:"pointer",whiteSpace:"nowrap",flexShrink:0,fontFamily:"inherit"}}>
                    {l}
                  </button>
                );
              })}
            </div>
            <div style={{marginTop:16}}>
              <button className="tap" onClick={()=>setMeasOpen(v=>!v)}
                style={{background:measOpen?C.accent:C.s3,color:measOpen?"#fff":C.text,border:"none",borderRadius:12,padding:"12px 16px",fontSize:14,fontWeight:700,width:"100%",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"space-between",fontFamily:"inherit"}}>
                <span>{measOpen ? "▲" : "📏"} Measurements {Object.keys(meas).length > 0 && `(${Object.keys(meas).length})`}</span>
                <span style={{fontSize:13,fontWeight:500,color:measOpen?"rgba(255,255,255,0.7)":C.sub}}>{measOpen ? "Hide" : "Add"}</span>
              </button>
              {measOpen && (
                <div style={{marginTop:8}}>
                  <MeasGrid measurements={meas} onChange={setMeas} />
                </div>
              )}
            </div>
          </>
        )}

        {/* ── Step 4: Review ── */}
        {step === 4 && (
          <>
            <div style={S.card}>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 10 }}>Order Summary</div>
              {[
                { l: "Customer", v: name },
                { l: "Phone", v: phone || "—" },
                { l: "Style", v: type || "—" },
                { l: "Price", v: price ? `₦${fmtPrice(price)}` : "—" },
                { l: "Deposit", v: deposit ? `₦${fmtPrice(deposit)}` : "—" },
                { l: "Delivery", v: date || "—" },
                { l: "Measurements", v: Object.keys(meas).length > 0 ? `${Object.keys(meas).length} taken` : "None" },
                { l: "Photos", v: selectedImages.length > 0 ? `${selectedImages.length} photo${selectedImages.length > 1 ? "s" : ""}` : "None" },
                { l: "Notes", v: notes || "None" },
              ].map((r, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: i < 8 ? `1px solid ${C.border}` : "none" }}>
                  <div style={{ fontSize: 13, color: C.sub }}>{r.l}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.text, textAlign: "right" }}>{r.v}</div>
                </div>
              ))}
            </div>

            <div>
              <div style={{fontSize:13,fontWeight:700,color:C.sub,letterSpacing:"0.5px",textTransform:"uppercase",marginBottom:8}}>Style Photos (max 5)</div>
              <input ref={fileInputRef} type="file" accept="image/*" multiple style={{display:"none"}} onChange={handleImageSelect} />
              <div style={{display:"grid",gridTemplateColumns:"repeat(5, 1fr)",gap:6}}>
                {selectedImages.map((img, i) => (
                  <div key={i} style={{position:"relative",aspectRatio:1,borderRadius:10,overflow:"hidden",background:C.s3}}>
                    <img src={img.url} alt="" style={{width:"100%",height:"100%",objectFit:"cover",display:"block"}} />
                    <button onClick={() => removeSelectedImage(i)}
                      style={{position:"absolute",top:2,right:2,width:20,height:20,borderRadius:"50%",background:"rgba(0,0,0,0.55)",color:"#fff",border:"none",fontSize:13,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>
                      ✕
                    </button>
                  </div>
                ))}
                {selectedImages.length < 5 && (
                  <button onClick={() => fileInputRef.current?.click()}
                    style={{aspectRatio:1,borderRadius:10,border:`1.5px dashed ${C.border2}`,background:C.s2,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,color:C.sub,cursor:"pointer",fontFamily:"inherit"}}>
                    +
                  </button>
                )}
              </div>
            </div>
            <Textarea label="Notes" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Style details, fabric colour, special requests…" />
            <div style={{marginTop:12}}>
              <VoiceNote onRecorded={b=>setVoiceBlob(b)} onRemove={()=>setVoiceBlob(null)} toast={toast} />
            </div>
          </>
        )}

        {/* Back button (not on step 1) */}
        {step > 1 && (
          <button className="tap" onClick={prevStep}
            style={{
              marginTop: 8, width: "100%", padding: "14px 0",
              backgroundColor: C.s3, color: C.text, fontWeight: 700,
              borderRadius: 14, fontSize: 15, border: "none", cursor: "pointer", fontFamily: "inherit",
            }}>
            ← Back
          </button>
        )}
      </Flow>

      {receiptPrompt && (
        <div style={{ position: "fixed", inset: 0, zIndex: 500, display: "flex", alignItems: "flex-end" }}>
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)" }} onClick={()=>{setReceiptPrompt(null);onClose();}} />
          <div className="anim-slide" style={{ position: "relative", zIndex: 1, background: C.s1, borderRadius: "32px 32px 0 0", padding: "28px 24px 48px", width: "100%" }}>
            <div style={{ fontSize: 24, marginBottom: 8, textAlign: "center" }}>🧾</div>
            <div style={{ fontSize: 19, fontWeight: 900, color: C.text, marginBottom: 8, textAlign: "center" }}>
              Receipt for {receiptPrompt.customer.name}
            </div>
            <div style={{ fontSize: 14, color: C.sub, lineHeight: 1.6, marginBottom: 24, textAlign: "center" }}>
              Share the receipt link on WhatsApp — your customer sees a professional invoice with payment details.
            </div>
            <Btn variant="wa" onClick={()=>{
              const url = invoiceUrl(receiptPrompt.order.id);
              window.open(url, "_blank");
              setReceiptPrompt(null);
              setTimeout(onClose, 500);
            }} style={{ marginBottom: 12 }}><span>📤</span> Share Receipt on WhatsApp</Btn>
            <Btn variant="outline" onClick={()=>{setReceiptPrompt(null);onClose();}}>Close</Btn>
          </div>
        </div>
      )}
    </>
  );
}
