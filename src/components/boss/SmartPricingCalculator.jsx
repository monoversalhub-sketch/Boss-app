"use client";
// src/components/boss/SmartPricingCalculator.jsx
import { useState } from "react";
import { C, S } from "./tokens";
import { uid, fmt } from "./helpers";
import { Btn, Input } from "./ui";

export function SmartPricingCalculator({ onUsePrice, compact = false }) {
  const [hourlyRate, setHourlyRate] = useState("");
  const [hours, setHours] = useState("");
  const [margin, setMargin] = useState("30");
  const [rushFee, setRushFee] = useState("");
  const [items, setItems] = useState([
    { id: uid(), label: "Fabric", amount: "" },
    { id: uid(), label: "Thread & Accessories", amount: "" },
  ]);

  const labour = (parseFloat(hourlyRate) || 0) * (parseFloat(hours) || 0);
  const production = items.reduce((s, i) => s + (parseFloat(i.amount) || 0), 0);
  const subtotal = labour + production;
  const profit = subtotal * ((parseFloat(margin) || 0) / 100);
  const withProfit = subtotal + profit;
  const rushPct = parseFloat(rushFee) || 0;
  const rushAmount = rushPct > 0 ? withProfit * (rushPct / 100) : 0;
  const finalPrice = withProfit + rushAmount;

  function addItem() {
    setItems((prev) => [...prev, { id: uid(), label: "", amount: "" }]);
  }
  function removeItem(id) {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }
  function updateItem(id, field, val) {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, [field]: val } : i)));
  }

  const hasResult = finalPrice > 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ ...S.card }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 12 }}>⚒️ Labour Cost</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <Input label="Hourly Rate (₦)" value={hourlyRate} onChange={(e) => setHourlyRate(e.target.value)} type="number" inputMode="numeric" placeholder="e.g. 2000" />
          <Input label="Hours Worked" value={hours} onChange={(e) => setHours(e.target.value)} type="number" inputMode="decimal" placeholder="e.g. 4" />
        </div>
        {labour > 0 && <div style={{ fontSize: 13, color: C.green, fontWeight: 700, marginTop: 8 }}>Labour: {fmt(labour)}</div>}
      </div>

      <div style={{ ...S.card }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 12 }}>🧵 Production Costs</div>
        {items.map((item, idx) => (
          <div key={item.id} style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 8, marginBottom: 10, alignItems: "end" }}>
            <Input label={idx === 0 ? "Item" : ""} value={item.label} onChange={(e) => updateItem(item.id, "label", e.target.value)} placeholder="e.g. Fabric" />
            <Input label={idx === 0 ? "Cost (₦)" : ""} value={item.amount} onChange={(e) => updateItem(item.id, "amount", e.target.value)} type="number" inputMode="numeric" placeholder="0" />
            <button onClick={() => removeItem(item.id)} style={{ background: C.redDim, border: "none", borderRadius: 10, width: 36, height: 46, fontSize: 16, color: C.red, cursor: "pointer", flexShrink: 0 }}>✕</button>
          </div>
        ))}
        <Btn variant="outline" onClick={addItem} style={{ fontSize: 13 }}>+ Add Item</Btn>
        {production > 0 && <div style={{ fontSize: 13, color: C.accent, fontWeight: 700, marginTop: 10 }}>Production: {fmt(production)}</div>}
      </div>

      <div style={{ ...S.card }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 12 }}>📈 Profit & Fees</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <Input label="Profit Margin (%)" value={margin} onChange={(e) => setMargin(e.target.value)} type="number" inputMode="numeric" placeholder="30" />
          <div>
            <Input label="Rush Fee (%)" value={rushFee} onChange={(e) => setRushFee(e.target.value)} type="number" inputMode="numeric" placeholder="0" />
            <div style={{ fontSize: 12, color: C.sub, marginTop: 2 }}>Add this for urgent or last-minute jobs</div>
          </div>
        </div>
      </div>

      {hasResult && (
        <div style={{ background: "linear-gradient(135deg,#1C1C1E,#2C2C2E)", borderRadius: 20, padding: 20, boxShadow: "0 4px 20px rgba(0,0,0,0.15)" }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 4 }}>
            Recommended Selling Price
          </div>
          <div style={{ fontSize: 42, fontWeight: 900, letterSpacing: "-2px", color: "#fff", lineHeight: 1 }}>
            {fmt(Math.ceil(finalPrice / 100) * 100)}
          </div>
          <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 6 }}>
            {[
              { label: "Labour", val: fmt(labour) },
              { label: "Production Costs", val: fmt(production) },
              { label: `Profit (${margin}%)`, val: fmt(profit) },
              ...(rushAmount > 0 ? [{ label: `Rush Fee (${rushPct}%)`, val: fmt(rushAmount) }] : []),
            ].map((r) => (
              <div key={r.label} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "rgba(255,255,255,0.5)" }}>
                <span>{r.label}</span>
                <span style={{ color: "rgba(255,255,255,0.8)", fontWeight: 600 }}>{r.val}</span>
              </div>
            ))}
          </div>
          {onUsePrice && (
            <button
              onClick={() => onUsePrice(Math.ceil(finalPrice / 100) * 100)}
              className="tap"
              style={{
                width: "100%",
                marginTop: 16,
                background: "#fff",
                border: "none",
                borderRadius: 12,
                padding: "14px",
                fontSize: 15,
                fontWeight: 800,
                color: C.text,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              ✓ Use This Price
            </button>
          )}
        </div>
      )}
    </div>
  );
}
