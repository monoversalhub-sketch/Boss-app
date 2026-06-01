"use client";
// src/components/boss/ProfileTab.jsx
import { useState, useEffect, useMemo, useRef } from "react";
import { C, S } from "../tokens";
import { allOrders, orderStatus, computeTrustScore, fmt, getBalance, getTotalPaid } from "../helpers";
import { useBOSS } from "../context";
import { Btn, Input } from "../ui";
import { SmartPricingCalculator } from "../SmartPricingCalculator";
import { db } from "../../../lib/db";
import { feedback } from "../../../lib/feedback";
import { referral } from "../../../lib/referral";

export function ProfileTab({ onFeedbackTrigger, onTour }) {
  const { tailor, setTailor, customers } = useBOSS();
  const [section, setSection] = useState(null);
  const [shop, setShop] = useState(tailor?.shop || "");
  const [phone, setPhone] = useState(tailor?.phone || "");
  const [city, setCity] = useState(tailor?.city || "");
  const [bankName, setBankName] = useState(tailor?.bank_name || "");
  const [accountNumber, setAccountNumber] = useState(tailor?.account_number || "");
  const [accountName, setAccountName] = useState(tailor?.account_name || "");
  const [saved, setSaved] = useState(false);

  const [restoreMsg, setRestoreMsg] = useState("");
  const restoreRef = useRef(null);
  const [referralCode, setReferralCode] = useState(null);
  const [referralStats, setReferralStats] = useState({ total: 0, activated: 0, rewarded: 0 });
  const [copied, setCopied] = useState(false);

  useEffect(() => { if (!saved) return; const id = setTimeout(() => setSaved(false), 2200); return () => clearTimeout(id); }, [saved]);

  useEffect(() => {
    referral.getMyCode().then(setReferralCode).catch(() => {});
    referral.getStats().then(setReferralStats).catch(() => {});
  }, []);

  const ts = computeTrustScore(customers);
  const orders = useMemo(() => allOrders(customers), [customers]);

  async function saveProfile() {
    const t = {
      ...(tailor || {}), shop: shop.trim(), phone: phone.trim(), city: city.trim(),
      bank_name: bankName.trim() || null,
      account_number: accountNumber.trim() || null,
      account_name: accountName.trim() || null,
    };
    await db.setTailor(t); setTailor(t); setSaved(true);
  }

  function exportBackup() {
    const data = { tailor, customers, exportedAt: new Date().toISOString(), version: "boss-v7" };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `boss-backup-${new Date().toISOString().slice(0, 10)}.json`; a.click();
  }

  function handleRestoreFile(e) {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        if (data.customers) { await db.setCustomers(data.customers); }
        if (data.tailor) { await db.setTailor(data.tailor); setTailor(data.tailor); }
        setRestoreMsg("✅ Data restored successfully. Refresh to see changes.");
      } catch { setRestoreMsg("❌ Invalid backup file."); }
    };
    reader.readAsText(file);
  }

  async function handleSignOut() {
    await db.signOut();
    window.location.reload();
  }

  const SubHeader = ({ title }) => (
    <div style={{ height: 64, display: "flex", alignItems: "center", padding: "0 20px", gap: 14, flexShrink: 0, borderBottom: `1px solid ${C.border}`, backgroundColor: C.s1 }}>
      <button className="tap" onClick={() => setSection(null)}
        style={{ width: 44, height: 44, backgroundColor: C.s2, border: "none", borderRadius: 12, fontSize: 20, cursor: "pointer", color: C.text, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "inherit" }}>←</button>
      <div style={{ flex: 1, fontSize: 17, fontWeight: 800, color: C.text }}>{title}</div>
    </div>
  );

  if (section === "edit") return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <SubHeader title="Edit Profile" />
      <div className="scrollable" style={{ flex: 1, padding: "20px", display: "flex", flexDirection: "column", gap: 14, paddingBottom: 80 }}>
        <Input label="Shop / Business Name *" value={shop} onChange={e => setShop(e.target.value)} placeholder="e.g. Chidi's Fashion House" />
        <Input label="Phone Number" value={phone} onChange={e => setPhone(e.target.value)} type="tel" placeholder="080XXXXXXXX" />
        <Input label="City" value={city} onChange={e => setCity(e.target.value)} placeholder="e.g. Lagos" />
        <div style={{ height: 1, background: C.border, margin: "4px 0" }} />
        <div style={{ fontSize: 13, fontWeight: 700, color: C.sub }}>💳 Payment Details (appears on customer receipts)</div>
        <Input label="Bank Name" value={bankName} onChange={e => setBankName(e.target.value)} placeholder="e.g. Access Bank" />
        <Input label="Account Number (added to customer receipts)" value={accountNumber} onChange={e => setAccountNumber(e.target.value)} placeholder="0123456789" />
        <Input label="Account Name" value={accountName} onChange={e => setAccountName(e.target.value)} placeholder="e.g. CHIDI OKONKWO" />
        <Btn variant={saved ? "green" : "primary"} onClick={saveProfile}>{saved ? "✅ Saved!" : "Save Changes"}</Btn>
      </div>
    </div>
  );

  if (section === "report") {
    const allOrdersData = allOrders(customers);
    const monthlyData = {};
    const typeData = {};
    const customerSpend = {};
    allOrdersData.forEach(o => {
      const month = (o.createdAt || o.created_at || "").slice(0, 7);
      if (month) { monthlyData[month] = (monthlyData[month] || 0) + getTotalPaid(o); }
      if (o.type) { typeData[o.type] = (typeData[o.type] || 0) + getTotalPaid(o); }
      const cname = o._cname || "Unknown";
      customerSpend[cname] = (customerSpend[cname] || 0) + getTotalPaid(o);
    });
    const top5 = Object.entries(customerSpend).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const inProgress = allOrdersData.filter(o => orderStatus(o) === "In Progress").length;
    const ready = allOrdersData.filter(o => orderStatus(o) === "Ready").length;
    const delivered = allOrdersData.filter(o => orderStatus(o) === "Delivered").length;
    const totalIncome = allOrdersData.reduce((s, o) => s + getTotalPaid(o), 0);
    const totalOutstanding = allOrdersData.reduce((s, o) => s + getBalance(o), 0);

    function exportCSV() {
      const rows = [["Date","Customer","Type","Price","Deposit","Paid","Balance","Status"]];
      allOrdersData.forEach(o => {
        rows.push([
          (o.createdAt || o.created_at || "").slice(0, 10),
          o._cname || "", o.type || "",
          o.price || 0, o.deposit || 0, getTotalPaid(o), getBalance(o),
          orderStatus(o),
        ]);
      });
      const csv = rows.map(r => r.join(",")).join("\n");
      const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `boss-report-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
    }

    return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <SubHeader title="Financial Report" />
        <div className="scrollable" style={{ flex: 1, padding: "20px", display: "flex", flexDirection: "column", gap: 12, paddingBottom: 80 }}>
          <div style={{ ...S.card, display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ fontSize: 13, color: C.sub, fontWeight: 600 }}>Total Income</div>
            <div style={{ fontSize: 30, fontWeight: 900, color: C.text }}>{fmt(totalIncome)}</div>
          </div>
          <div style={{ ...S.card, display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ fontSize: 13, color: C.sub, fontWeight: 600 }}>Still Owed to You</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: totalOutstanding > 0 ? C.red : C.sub }}>{fmt(totalOutstanding)}</div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
            {[
              { label: "In Progress", value: inProgress, color: C.accent },
              { label: "Ready", value: ready, color: C.amber },
              { label: "Delivered", value: delivered, color: C.green },
            ].map(s => (
              <div key={s.label} style={{ ...S.card, padding: 14, textAlign: "center" }}>
                <div style={{ fontSize: 22, fontWeight: 900, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: 10, color: C.sub, fontWeight: 600, marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>
          {monthlyData && <div style={{ ...S.card }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 10 }}>Income by Month</div>
            {Object.entries(monthlyData).sort().slice(-6).map(([m, amt]) => (
              <div key={m} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: `1px solid ${C.border}` }}>
                <div style={{ fontSize: 13, color: C.sub }}>{m}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{fmt(amt)}</div>
              </div>
            ))}
          </div>}
          {top5.length > 0 && <div style={{ ...S.card }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 10 }}>Top Customers</div>
            {top5.map(([name, amt], i) => (
              <div key={name} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: `1px solid ${C.border}` }}>
                <div style={{ fontSize: 13, color: C.sub }}>{i + 1}. {name}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{fmt(amt)}</div>
              </div>
            ))}
          </div>}
          <Btn variant="primary" onClick={exportCSV}>⬇️ Download CSV Report</Btn>
        </div>
      </div>
    );
  }

  if (section === "data") return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <SubHeader title="Data & Backup" />
      <div className="scrollable" style={{ flex: 1, padding: "20px", display: "flex", flexDirection: "column", gap: 12, paddingBottom: 80 }}>
        <div style={{ ...S.card }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 6 }}>Export Backup</div>
          <div style={{ fontSize: 13, color: C.sub, lineHeight: 1.6, marginBottom: 12 }}>Download all your customers, orders, measurements, and settings as a JSON file. Save to Google Drive or WhatsApp Saved Messages.</div>
          <Btn variant="primary" onClick={exportBackup}>⬇️ Download Backup File</Btn>
        </div>
        <div style={{ ...S.card }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 6 }}>Restore from Backup</div>
          <div style={{ fontSize: 13, color: C.sub, lineHeight: 1.6, marginBottom: 12 }}>Upload a previously downloaded BOSS backup file to restore your data.</div>
          <input ref={restoreRef} type="file" accept=".json" onChange={handleRestoreFile} style={{ display: "none" }} />
          <Btn variant="outline" onClick={() => restoreRef.current?.click()}>📂 Choose Backup File</Btn>
          {restoreMsg && <div style={{ fontSize: 13, color: restoreMsg.startsWith("✅") ? C.green : C.red, marginTop: 8, fontWeight: 500 }}>{restoreMsg}</div>}
        </div>
        <div style={{ ...S.card, background: "rgba(255,159,10,0.06)", border: "1px solid rgba(255,159,10,0.2)" }}>
          <div style={{ fontSize: 13, color: "#FF9F0A", fontWeight: 700 }}>💡 Auto-backup to Google Drive coming soon</div>
          <div style={{ fontSize: 13, color: C.sub, marginTop: 4 }}>We'll automatically back up your data to Google Drive daily.</div>
        </div>
      </div>
    </div>
  );

  if (section === "tools") return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <SubHeader title="Smart Pricing Calculator" />
      <div className="scrollable" style={{ flex: 1, padding: "20px", paddingBottom: 80 }}>
        <div style={{ fontSize: 13, color: C.sub, lineHeight: 1.6, marginBottom: 16 }}>Calculate the right price for any job — labour, materials, and your profit margin.</div>
        <SmartPricingCalculator compact={false} onUsePrice={() => { }} />
      </div>
    </div>
  );

  if (section === "about") return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <SubHeader title="About BOSS" />
      <div className="scrollable" style={{ flex: 1, padding: "20px", display: "flex", flexDirection: "column", gap: 12, paddingBottom: 80 }}>
        <div style={{ ...S.card, display: "flex", flexDirection: "column", gap: 10 }}>
          {[
            { l: "App Version", v: "BOSS v7.0" },
            { l: "Built by", v: "Monoversal Hub" },
            { l: "Auth", v: "Google OAuth" },
            { l: "CAC/BN", v: "BN 9319562" },
          ].map(r => (
            <div key={r.l} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 13, color: C.sub, fontWeight: 500 }}>{r.l}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{r.v}</div>
            </div>
          ))}
        </div>
        <div style={{ ...S.card, background: "rgba(0,102,204,0.04)", border: "1px solid rgba(0,102,204,0.15)" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.accent, marginBottom: 4 }}>BOSS — Build Trust. Grow Faster.</div>
          <div style={{ fontSize: 13, color: C.sub, lineHeight: 1.7 }}>A lightweight trust and operations system for informal African businesses. Made in Nigeria 🇳🇬 for tailors, artisans, and service providers.</div>
        </div>
      </div>
    </div>
  );

  const initials = (tailor?.shop || "B").split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  const menuItems = [
    { icon: "👤", label: "Edit Profile", sub: "Shop, phone and bank details", key: "edit" },
    { icon: "📊", label: "Financial Report", sub: "Income, customers, export CSV", key: "report" },
    { icon: "☁️", label: "Data & Backup", sub: "Export, restore your data", key: "data" },
    { icon: "🧮", label: "Smart Pricing", sub: "Calculate your job prices", key: "tools" },
    { icon: "🎓", label: "How BOSS Works", sub: "Replay the quick tour", key: "onboarding_tour" },
    { icon: "🐛", label: "Report a Problem", sub: "Tell us what went wrong", key: "bug" },
    { icon: "💡", label: "Suggest a Feature", sub: "What should BOSS do next?", key: "feature" },
    { icon: "ℹ️", label: "About BOSS", sub: "Version, credits", key: "about" },
  ];

  return (
    <div className="scrollable" style={{ flex: 1, paddingBottom: 120 }}>
      <div style={{ background: `linear-gradient(160deg,${C.dark},#2C2C2E)`, padding: "32px 20px 28px", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: -40, right: -20, width: 140, height: 140, borderRadius: "50%", background: "rgba(255,255,255,0.03)" }} />
        <div style={{ position: "absolute", bottom: -30, left: -10, width: 100, height: 100, borderRadius: "50%", background: "rgba(255,255,255,0.02)" }} />
        <div style={{ width: 72, height: 72, borderRadius: 22, background: `linear-gradient(135deg,${C.accent},rgba(0,102,204,0.5))`, border: "2px solid rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, fontWeight: 900, color: "#fff", marginBottom: 16, letterSpacing: "-1px" }}>
          {initials}
        </div>
        <div style={{ fontSize: 24, fontWeight: 900, color: "#fff", letterSpacing: "-0.5px", lineHeight: 1.2, marginBottom: 4 }}>
          {tailor?.shop || "Your Shop Name"}
        </div>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
          {tailor?.city && <span style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", fontWeight: 500 }}>📍 {tailor.city}</span>}
          {tailor?.phone && <span style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", fontWeight: 500 }}>📞 {tailor.phone}</span>}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
          {[
            { top: String(ts.score), mid: ts.level, btm: "Trust Score", color: ts.score >= 70 ? C.green : ts.score >= 45 ? "#FF9F0A" : C.red },
            { top: String(allOrders(customers).filter(o => orderStatus(o) === "Delivered").length), mid: "completed", btm: "Orders" },
            { top: String(customers.length), mid: "served", btm: "Customers" },
          ].map((s, i) => (
            <div key={i} style={{ background: "rgba(255,255,255,0.07)", borderRadius: 14, padding: "12px 10px", textAlign: "center", border: "1px solid rgba(255,255,255,0.08)" }}>
              <div style={{ fontSize: 22, fontWeight: 900, color: s.color || "#fff", lineHeight: 1 }}>{s.top}</div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", marginTop: 3, fontWeight: 600 }}>{s.mid}</div>
              <div style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", marginTop: 1 }}>{s.btm}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding: "16px 20px 0", display: "flex", flexDirection: "column", gap: 8 }}>
        {menuItems.map(item => {
          function handleClick() {
            if (item.key === "bug") onFeedbackTrigger?.("bug");
            else if (item.key === "feature") onFeedbackTrigger?.("feature");
            else if (item.key === "onboarding_tour") onTour?.();
            else setSection(item.key);
          }
          return (
            <button key={item.key} className="tap" onClick={handleClick}
              style={{ ...S.card, display: "flex", alignItems: "center", gap: 14, cursor: "pointer", textAlign: "left", width: "100%", fontFamily: "inherit", padding: "14px 16px" }}>
              <div style={{ width: 40, height: 40, borderRadius: 13, background: C.s2, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>{item.icon}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{item.label}</div>
                <div style={{ fontSize: 13, color: C.sub, marginTop: 1 }}>{item.sub}</div>
              </div>
              <div style={{ fontSize: 18, color: C.muted, flexShrink: 0 }}>›</div>
            </button>
          );
        })}
      </div>

      {/* REFERRAL CARD */}
      {referralCode && (
        <div style={{
          backgroundColor: C.s1, borderRadius: 20,
          padding: 20, margin: "16px 16px 0",
          border: `1px solid ${C.border}`,
          boxShadow: "0 4px 12px rgba(0,0,0,0.03)",
        }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: C.text }}>
            Refer a Tailor 🤝
          </div>
          <div style={{ fontSize: 13, color: C.sub, marginTop: 3 }}>
            Earn rewards when your fellow tailors join BOSS
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
            {[
              { label: "Referred", value: referralStats.total },
              { label: "Active", value: referralStats.activated },
              { label: "Rewarded", value: referralStats.rewarded },
            ].map(s => (
              <div key={s.label} style={{
                backgroundColor: C.s3, borderRadius: 12,
                padding: "6px 12px", fontSize: 12, fontWeight: 700,
                color: C.text,
              }}>
                {s.value} {s.label}
              </div>
            ))}
          </div>
          <div style={{ fontSize: 11, color: C.sub, marginTop: 16,
            textTransform: "uppercase", letterSpacing: 1 }}>
            Your Referral Code
          </div>
          <div style={{
            fontFamily: "monospace", fontSize: 22, fontWeight: 900,
            color: C.accent, letterSpacing: 4, marginTop: 4,
          }}>
            {referralCode}
          </div>
          <button onClick={() => referral.shareOnWhatsApp(referralCode, tailor?.shop)}
            style={{
              marginTop: 16, width: "100%", padding: "14px 0",
              backgroundColor: "#25D366", color: "white", fontWeight: 800,
              borderRadius: 14, fontSize: 15, border: "none", cursor: "pointer",
              fontFamily: "inherit",
            }}>
            📲 Share on WhatsApp
          </button>
          <button onClick={async () => {
            await navigator.clipboard.writeText(referral.buildLink(referralCode));
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}
            style={{
              marginTop: 8, width: "100%", padding: "14px 0",
              backgroundColor: C.s3, color: C.text, fontWeight: 800,
              borderRadius: 14, fontSize: 15, border: "none", cursor: "pointer",
              fontFamily: "inherit",
            }}>
            {copied ? "✅ Link copied!" : "📋 Copy Link"}
          </button>
          <div style={{
            fontSize: 12, color: C.sub, marginTop: 16,
            lineHeight: 1.6, textAlign: "center",
          }}>
            When a tailor you refer saves their first 3 orders,
            your BOSS Trust Score goes up by +5 points. 🏆
          </div>
        </div>
      )}

      <div style={{ padding: "16px 20px 0" }}>
        <button className="tap" onClick={handleSignOut}
          style={{ width: "100%", padding: "15px", borderRadius: 16, fontSize: 15, fontWeight: 700, border: "1.5px solid rgba(255,59,48,0.2)", cursor: "pointer", background: "rgba(255,59,48,0.05)", color: C.red, fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
          🚪 Sign Out
        </button>
      </div>

      <div style={{ padding: "16px 20px 32px", textAlign: "center" }}>
        <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.8 }}>BOSS · Build Trust. Grow Faster.<br />© 2026 Monoversal Hub · All rights reserved</div>
      </div>
    </div>
  );
}
