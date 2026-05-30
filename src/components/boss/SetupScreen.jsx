"use client";
// src/components/boss/SetupScreen.jsx
import { useState } from "react";
import { C, S } from "./tokens";
import { Input, Select } from "./ui";
import { db } from "../../lib/db";

const NIGERIAN_CITIES = [
  "Lagos","Abuja","Kano","Ibadan","Port Harcourt","Benin City","Kaduna",
  "Enugu","Owerri","Abeokuta","Onitsha","Warri","Calabar","Uyo","Aba",
  "Akure","Ilorin","Jos","Maiduguri","Bauchi","Sokoto","Zaria","Katsina",
  "Minna","Makurdi","Awka","Asaba","Yola","Lafia","Gombe","Damaturu",
  "Dutse","Jalingo","Lokoja","Umuahia","Yenagoa","Ekiti","Osogbo",
  "Ile-Ife","Lekki","Victoria Island","Ikeja","Ajah",
];

export function SetupScreen({ onComplete }) {
  const [shop, setShop] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [cityOther, setCityOther] = useState("");
  const [saving, setSaving] = useState(false);
  const [showDeclaration, setShowDeclaration] = useState(false);
  const [yearsInBusiness, setYearsInBusiness] = useState("");
  const [monthlyOrders, setMonthlyOrders] = useState("");
  const [monthlyRevenue, setMonthlyRevenue] = useState("");

  function computeSelfScore() {
    let score = 0;
    if (yearsInBusiness === "10+ years")        score += 12;
    else if (yearsInBusiness === "5–10 years")  score += 9;
    else if (yearsInBusiness === "3–5 years")   score += 6;
    else if (yearsInBusiness === "1–3 years")   score += 3;
    const mo = parseFloat(monthlyOrders) || 0;
    if (mo >= 20) score += 10; else if (mo >= 10) score += 7; else if (mo >= 5) score += 4; else if (mo >= 1) score += 2;
    const mr = parseFloat(monthlyRevenue) || 0;
    if (mr >= 500000) score += 8; else if (mr >= 200000) score += 6; else if (mr >= 50000) score += 4; else if (mr > 0) score += 2;
    return Math.min(30, score);
  }

  const selfScore = computeSelfScore();
  const hasSelfData = !!(yearsInBusiness || monthlyOrders || monthlyRevenue);

  async function go() {
    if (!shop.trim()) return;
    setSaving(true);
    const finalCity = city === "Other" ? cityOther.trim() : city;
    const t = {
      shop: shop.trim(), phone: phone.trim(), city: finalCity,
      self_declared_score: hasSelfData ? selfScore : 0,
      self_declared_years: yearsInBusiness || null,
    };
    await db.setTailor(t);
    onComplete(t);
  }

  return (
    <div style={{ height: "100%", background: C.bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, fontFamily: "'Plus Jakarta Sans',sans-serif", overflow: "auto" }}>
      <div style={{ width: "100%", maxWidth: 400 }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ width: 64, height: 64, background: C.text, borderRadius: 20, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 30, color: "#fff", margin: "0 auto 16px", boxShadow: "0 8px 30px rgba(0,0,0,0.12)", fontWeight: 900 }}>B</div>
          <div style={{ fontSize: 26, fontWeight: 900, letterSpacing: "-0.5px", color: C.text, lineHeight: 1.2, marginBottom: 8 }}>
            It&apos;s time your business<br />got the respect it deserves.
          </div>
          <div style={{ fontSize: 13, color: C.sub, lineHeight: 1.6 }}>
            Set up your BOSS profile in 30 seconds.<br />Your first record is your first proof.
          </div>
        </div>
        <div style={{ background: C.s1, borderRadius: 24, padding: 24, boxShadow: "0 2px 20px rgba(0,0,0,0.08)", display: "flex", flexDirection: "column", gap: 14 }}>
          <Input label="Shop / Business Name *" value={shop} onChange={e => setShop(e.target.value)} placeholder="e.g. Taiwo's Fashion House" autoFocus />
          <Input label="Your Phone Number" value={phone} onChange={e => setPhone(e.target.value)} type="tel" placeholder="080XXXXXXXX" />

          <div style={{ display: "flex", flexDirection: "column" }}>
            <label style={S.label}>City</label>
            <select value={city} onChange={e => setCity(e.target.value)}
              style={{ ...S.input, color: city ? C.text : C.sub, backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8'%3E%3Cpath d='M0 0l6 8 6-8z' fill='%23888'/%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 14px center", paddingRight: 36 }}>
              <option value="">Select your city…</option>
              {NIGERIAN_CITIES.map(c => <option key={c} value={c}>{c}</option>)}
              <option value="Other">Other (not listed)</option>
            </select>
            {city === "Other" && (
              <input value={cityOther} onChange={e => setCityOther(e.target.value)} placeholder="Type your city" style={{ ...S.input, marginTop: 8, color: C.text }} />
            )}
          </div>

          <div className="tap" onClick={() => setShowDeclaration(v => !v)}
            style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 14px", background: C.s2, borderRadius: 12, cursor: "pointer", border: `1px solid ${showDeclaration ? C.accent : C.border}` }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>📋 Tell us about your experience</div>
              <div style={{ fontSize: 11, color: C.sub, marginTop: 1 }}>Optional · Boosts your starting BOSS score</div>
            </div>
            <div style={{ fontSize: 14, color: C.sub }}>{showDeclaration ? "▲" : "▼"}</div>
          </div>

          {showDeclaration && (
            <div style={{ background: C.s2, borderRadius: 14, padding: 16, display: "flex", flexDirection: "column", gap: 12, border: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 12, color: C.sub, lineHeight: 1.6 }}>
                This gives you a starting score while your real record builds. It is marked self-reported and improves automatically as you add orders.
              </div>
              <Select label="Years in business"
                options={[{ value: "", label: "Select…" }, "Less than 1 year", "1–3 years", "3–5 years", "5–10 years", "10+ years"]}
                value={yearsInBusiness} onChange={e => setYearsInBusiness(e.target.value)} />
              <Input label="Approx. monthly orders" type="number" inputMode="numeric" value={monthlyOrders} onChange={e => setMonthlyOrders(e.target.value)} placeholder="e.g. 15" />
              <Input label="Approx. monthly revenue (₦)" type="number" inputMode="numeric" value={monthlyRevenue} onChange={e => setMonthlyRevenue(e.target.value)} placeholder="e.g. 150000" />
              {hasSelfData && (
                <div style={{ background: "rgba(52,199,89,0.08)", border: "1px solid rgba(52,199,89,0.2)", borderRadius: 10, padding: "10px 14px" }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: C.green }}>Starting BOSS score: {selfScore} / 30 ⭐</div>
                  <div style={{ fontSize: 11, color: C.sub, marginTop: 2 }}>Self-reported · Grows automatically with real orders</div>
                </div>
              )}
            </div>
          )}

          <button className="tap" onClick={go} disabled={!shop.trim() || saving}
            style={{ ...S.btn, background: C.text, color: "#fff", opacity: !shop.trim() || saving ? 0.5 : 1 }}>
            {saving ? "Setting up…" : "Start Using BOSS →"}
          </button>
        </div>
      </div>
    </div>
  );
}
