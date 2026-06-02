"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { C, S, NG_BANKS } from "./tokens";
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

const tourSlides = [
  {
    emoji: "✂️",
    headline: "Add an order in 15 seconds",
    body: "Tap the + button, type your customer's name, set the price and delivery date. Done.\nBOSS remembers everything so you don't have to.",
  },
  {
    emoji: "💰",
    headline: "Always know who owes you",
    body: "Every deposit and payment you record is tracked automatically. Open the Earnings tab anytime to see exactly what you've collected and what's still outstanding.",
  },
  {
    emoji: "📲",
    headline: "Send receipts on WhatsApp",
    body: "After collecting a payment, send your customer a professional receipt in one tap — straight from WhatsApp. No typing. No printing.\nThey'll know you mean serious business.",
  },
];

function containerStyle(step) {
  return {
    height: "100%",
    background: C.bg,
    display: "flex",
    flexDirection: "column",
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    overflow: "hidden",
  };
}

function topBarStyle() {
  return {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "16px 20px 0",
  };
}

function scrollContentStyle() {
  return {
    flex: 1,
    overflowY: "auto",
    padding: "24px 20px 40px",
  };
}

export function SetupScreen({ onComplete, onCompleteAndAddOrder }) {
  const [step, setStepState] = useState(1);
  const [shop, setShop] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [cityOther, setCityOther] = useState("");
  const [yearsInBusiness, setYearsInBusiness] = useState("");
  const [monthlyOrders, setMonthlyOrders] = useState("");
  const [monthlyRevenue, setMonthlyRevenue] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const tourTouchStart = useRef(null);

  const savedTourSlide = parseInt(localStorage.getItem("boss_onboarding_tour_slide") || "0");
  const [tourSlide, setTourSlideRaw] = useState(savedTourSlide);

  function setTourSlide(n) {
    setTourSlideRaw(n);
    localStorage.setItem("boss_onboarding_tour_slide", String(n));
  }

  function setStep(n) {
    setStepState(n);
  }

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

  async function handleFinish(addOrder) {
    setSaving(true);
    const finalCity = city === "Other" ? cityOther.trim() : city;
    const t = {
      shop: shop.trim(), phone: phone.trim(), city: finalCity,
      bank_name: bankName.trim() || null,
      account_number: accountNumber.trim() || null,
      account_name: accountName.trim() || null,
      self_declared_score: hasSelfData ? selfScore : 0,
      self_declared_years: yearsInBusiness || null,
    };
    await db.setTailor(t);
    localStorage.setItem("boss_onboarding_v1_complete", "1");
    setSaving(false);
    if (addOrder) onCompleteAndAddOrder(t);
    else onComplete(t);
  }

  const btnPrimary = {
    width: "100%", padding: "16px", borderRadius: 16, fontSize: 15,
    fontWeight: 800, border: "none", cursor: "pointer", fontFamily: "inherit",
    backgroundColor: C.text, color: "#fff",
  };

  const progressDot = (n) => ({
    width: n === step ? 20 : 6, height: 6, borderRadius: 3,
    backgroundColor: n <= step ? C.accent : C.s4,
    transition: "all 0.3s ease",
  });

  return (
    <div style={containerStyle(step)}>
      {/* TOP BAR */}
      <div style={topBarStyle()}>
        {step > 1 && step !== 4 ? (
          <button onClick={() => setStep(step - 1)}
            style={{ fontSize: 20, color: C.text, background: "none", border: "none", cursor: "pointer", padding: 8 }}>
            ←
          </button>
        ) : <div style={{ width: 36 }} />}

        {step !== 4 && (
          <div style={{ display: "flex", gap: 6 }}>
            {[1,2,3,4,5].map(n => <div key={n} style={progressDot(n)} />)}
          </div>
        )}

        {step > 1 && step < 5 && step !== 4 ? (
          <button onClick={() => setStep(step + 1)}
            style={{ fontSize: 13, color: C.sub, background: "none", border: "none", cursor: "pointer", padding: 8, fontWeight: 600 }}>
            Skip →
          </button>
        ) : <div style={{ width: 60 }} />}
      </div>

      {/* STEP CONTENT */}
      <div style={scrollContentStyle()}>
        {msg && (
          <div style={{ backgroundColor: "rgba(255,59,48,0.1)", borderRadius: 10, padding: "10px 14px", marginBottom: 12, fontSize: 13, fontWeight: 600, color: "#FF3B30", textAlign: "center" }}>
            {msg}
          </div>
        )}
        {step === 1 && (
          <div>
            <div style={{ textAlign: "center", marginBottom: 28 }}>
              <div style={{ width: 48, height: 48, background: C.text, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, color: "#fff", margin: "0 auto 12px", fontWeight: 900 }}>B</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: C.text, lineHeight: 1.2, marginBottom: 6 }}>
                Let&apos;s set up your shop
              </div>
              <div style={{ fontSize: 13, color: C.sub }}>
                Takes 30 seconds. No card needed.
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
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
              <button onClick={async () => {
                if (!shop.trim()) { setMsg("⚠️ Enter your shop name to continue"); return; }
                setMsg("");
                await db.setTailor({ shop: shop.trim(), phone: phone.trim(), city: city === "Other" ? cityOther.trim() : city });
                setStep(2);
              }}
                style={btnPrimary}>
                Continue →
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <div style={{ fontSize: 20, fontWeight: 800, color: C.text, marginBottom: 8 }}>
              How long have you been sewing?
            </div>
            <div style={{ fontSize: 13, color: C.sub, lineHeight: 1.6, marginBottom: 24 }}>
              This gives you a starting BOSS score while your real record builds. Completely optional.
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <Select label="Years in business"
                options={[{ value: "", label: "Select…" }, "Less than 1 year", "1–3 years", "3–5 years", "5–10 years", "10+ years"]}
                value={yearsInBusiness} onChange={e => setYearsInBusiness(e.target.value)} />
              <Input label="Approx. monthly orders" type="number" inputMode="numeric" value={monthlyOrders} onChange={e => setMonthlyOrders(e.target.value)} placeholder="e.g. 15" />
              <Input label="Approx. monthly revenue (₦)" type="number" inputMode="numeric" value={monthlyRevenue} onChange={e => setMonthlyRevenue(e.target.value)} placeholder="e.g. 150000" />
              {hasSelfData && (
                <div style={{ background: "rgba(52,199,89,0.08)", border: "1px solid rgba(52,199,89,0.2)", borderRadius: 10, padding: "10px 14px" }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: C.green }}>Starting BOSS score: {selfScore} / 30 ⭐</div>
                  <div style={{ fontSize: 13, color: C.sub, marginTop: 2 }}>Self-reported · Grows automatically with real orders</div>
                </div>
              )}
              <button onClick={() => setStep(3)} style={btnPrimary}>Continue →</button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <div style={{ fontSize: 20, fontWeight: 800, color: C.text, marginBottom: 8 }}>
              Add your payment details
            </div>
            <div style={{ fontSize: 13, color: C.sub, lineHeight: 1.6, marginBottom: 24 }}>
              Add your bank details so customers know where to pay you. Takes 30 seconds — this shows up on every receipt.
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <label style={S.label}>Bank Name</label>
                <select value={bankName} onChange={e => setBankName(e.target.value)}
                  style={{ ...S.input, color: bankName ? C.text : C.sub, backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8'%3E%3Cpath d='M0 0l6 8 6-8z' fill='%23888'/%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 14px center", paddingRight: 36 }}>
                  <option value="">Select bank…</option>
                  {NG_BANKS.map(b => <option key={b.code} value={b.name}>{b.name}</option>)}
                </select>
              </div>
              <Input label="Account Number" value={accountNumber} onChange={e => setAccountNumber(e.target.value)} placeholder="0123456789" />
              <Input label="Account Name" value={accountName} onChange={e => setAccountName(e.target.value)} placeholder="e.g. CHIDI OKONKWO" />
              <div style={{ backgroundColor: C.s2, borderRadius: 12, padding: "12px 14px", marginTop: 8, border: `1px solid ${C.border}` }}>
                <div style={{ fontSize: 11, color: C.sub, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>
                  PREVIEW — How customers see it
                </div>
                <div style={{ fontSize: 13, color: C.text }}>
                  Bank: <strong>{bankName || "GTBank"}</strong>
                </div>
                <div style={{ fontSize: 13, color: C.text }}>
                  Account: <strong>{accountNumber || "0123456789"}</strong>
                </div>
                <div style={{ fontSize: 13, color: C.text }}>
                  Name: <strong>{accountName || "Your Name"}</strong>
                </div>
              </div>
              <button onClick={() => setStep(4)} style={btnPrimary}>Continue →</button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div>
            <div style={{ position: "relative", overflow: "hidden", padding: "20px 0" }}
              onTouchStart={e => { tourTouchStart.current = e.touches[0].clientX; }}
              onTouchEnd={e => {
                if (!tourTouchStart.current) return;
                const diff = tourTouchStart.current - e.changedTouches[0].clientX;
                if (diff > 50 && tourSlide < tourSlides.length - 1) setTourSlide(s => s + 1);
                if (diff < -50 && tourSlide > 0) setTourSlide(s => s - 1);
                tourTouchStart.current = null;
              }}>
              <div style={{ display: "flex", transition: "transform 0.25s ease", transform: `translateX(-${tourSlide * 100}%)` }}>
                {tourSlides.map((s, i) => (
                  <div key={i} style={{ width: "100%", flexShrink: 0, textAlign: "center" }}>
                    <div style={{ fontSize: 72, marginBottom: 16 }}>{s.emoji}</div>
                    <div style={{ fontSize: 22, fontWeight: 900, color: C.text, lineHeight: 1.3, marginBottom: 12 }}>
                      {s.headline}
                    </div>
                    <div style={{ fontSize: 14, color: C.sub, lineHeight: 1.7, whiteSpace: "pre-line", maxWidth: 320, margin: "0 auto" }}>
                      {s.body}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ display: "flex", gap: 6, justifyContent: "center", marginTop: 16, alignItems: "center" }}>
              {tourSlides.map((_, i) => (
                <div key={i} onClick={() => setTourSlide(i)}
                  style={{ width: i === tourSlide ? 20 : 6, height: 6, borderRadius: 3, backgroundColor: i === tourSlide ? C.accent : C.s4, cursor: "pointer", transition: "all 0.2s" }} />
              ))}
            </div>
            <div style={{ marginTop: 24 }}>
              {tourSlide < tourSlides.length - 1 ? (
                <button onClick={() => setTourSlide(s => s + 1)} style={btnPrimary}>Next →</button>
              ) : (
                <button onClick={() => setStep(5)} style={btnPrimary}>I&apos;m ready →</button>
              )}
            </div>
          </div>
        )}

        {step === 5 && (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 22, fontWeight: 900, color: C.text, lineHeight: 1.3, marginBottom: 8 }}>
              🎉 You&apos;re all set, {shop.split(" ")[0] || "Boss"}!
            </div>
            <div style={{ fontSize: 14, color: C.sub, lineHeight: 1.6, marginBottom: 24 }}>
              Your BOSS profile is ready. Now let&apos;s add your first order — it takes under a minute.
            </div>
            <div style={{
              backgroundColor: C.text, borderRadius: 20, padding: 24, textAlign: "center",
            }}>
              <div style={{ fontSize: 48 }}>✂️</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: "#fff", marginTop: 12 }}>
                Add your first order
              </div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", marginTop: 6, lineHeight: 1.6 }}>
                Got a customer waiting? Add their order now and start building your record.
              </div>
              <button onClick={() => handleFinish(true)} disabled={saving}
                style={{
                  marginTop: 20, width: "100%", backgroundColor: C.accent, color: "#fff",
                  borderRadius: 14, padding: "14px 0", fontSize: 16, fontWeight: 800,
                  border: "none", cursor: "pointer", fontFamily: "inherit",
                  opacity: saving ? 0.6 : 1,
                }}>
                {saving ? "Setting up…" : "✂️ Add My First Order →"}
              </button>
            </div>
            <button onClick={() => handleFinish(false)} disabled={saving}
              style={{
                marginTop: 16, fontSize: 14, color: C.sub, background: "none",
                border: "none", cursor: "pointer", fontFamily: "inherit", fontWeight: 600,
                opacity: saving ? 0.5 : 1,
              }}>
              Go to dashboard first
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
