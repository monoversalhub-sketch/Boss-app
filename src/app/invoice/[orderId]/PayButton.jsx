"use client";
// src/app/invoice/[orderId]/PayButton.jsx
// ─────────────────────────────────────────────────────────────────
//  Public invoice page — Pay button component.
//
//  PAYMENT MODEL (per BOSS master doc):
//  ─────────────────────────────────────────────────────────────────
//  Primary payment method: BANK TRANSFER to the tailor's
//  Dedicated Virtual Account. The customer copies the account
//  details and transfers from their own bank app. Paystack's webhook
//  automatically detects the transfer and credits the BOSS wallet.
//
//  Secondary: Paystack popup (card / bank transfer via Paystack UI)
//  for customers who prefer it or don't have mobile banking.
//  No subaccount routing — money goes to BOSS Paystack balance,
//  credited to the tailor's wallet.
// ─────────────────────────────────────────────────────────────────
import { useState, useEffect } from "react";

const C = {
  bg:      "#F5F5F7",
  s1:      "#FFFFFF",
  s2:      "#F4F4F5",
  s3:      "#E4E4E7",
  accent:  "#0066CC",
  green:   "#34C759",
  red:     "#FF3B30",
  text:    "#111111",
  sub:     "#8E8E93",
  border:  "#E5E5EA",
};

export default function PayButton({ order, customer, tailor, publicKey }) {
  const [sdkReady,  setSdkReady]  = useState(false);
  const [status,    setStatus]    = useState("idle");
  const [copied,    setCopied]    = useState(false);
  const [activeTab, setActiveTab] = useState("transfer"); // "transfer" | "card"

  const balance = Math.max(0, order.price - order.deposit - order.paid);
  const hasVA   = !!(tailor.virtual_account_number && tailor.virtual_account_status === "active");

  // Load Paystack SDK
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.PaystackPop) { setSdkReady(true); return; }
    const s    = document.createElement("script");
    s.src      = "https://js.paystack.co/v1/inline.js";
    s.async    = true;
    s.onload   = () => setSdkReady(true);
    document.head.appendChild(s);
  }, []);

  // Copy virtual account details to clipboard
  async function copyDetails() {
    const text = [
      `Bank: ${tailor.virtual_bank_name}`,
      `Account Number: ${tailor.virtual_account_number}`,
      `Account Name: ${tailor.virtual_account_name}`,
      `Amount: ₦${balance.toLocaleString("en-NG")}`,
      `Ref: ${customer.name} — ${order.type || "Order"}`,
    ].join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      // fallback for older mobile browsers
      const el = document.createElement("textarea");
      el.value = text; el.style.position = "fixed"; el.style.opacity = "0";
      document.body.appendChild(el); el.select();
      document.execCommand("copy"); document.body.removeChild(el);
      setCopied(true); setTimeout(() => setCopied(false), 3000);
    }
  }

  // Paystack popup (card payment)
  function handleCardPay() {
    if (!sdkReady || !window.PaystackPop) {
      setStatus("error");
      return;
    }
    if (!publicKey) {
      setStatus("no_key");
      return;
    }

    setStatus("loading");
    const config = {
      key:      publicKey,
      email:    customer.phone
                  ? `${customer.phone.replace(/\D/g, "")}@boss.app`
                  : "customer@boss.app",
      amount:   Math.round(balance * 100),  // ₦ → kobo
      currency: "NGN",
      ref:      `BOSS_${order.id}_${Date.now()}`,
      metadata: {
        custom_fields: [
          { display_name: "Shop",     variable_name: "shop",     value: tailor.shop },
          { display_name: "Customer", variable_name: "customer", value: customer.name },
          { display_name: "Item",     variable_name: "item",     value: order.type || "Order" },
        ],
      },
      callback: () => {
        // Webhook handles the DB update. Show success.
        setStatus("success");
      },
      onClose: () => {
        setStatus("idle");
      },
    };
    // No subaccount — money goes to BOSS Paystack balance,
    // credited to tailor wallet by webhook
    window.PaystackPop.setup(config).openIframe();
  }

  if (balance <= 0) {
    return (
      <div style={{
        background:   "rgba(52,199,89,0.1)",
        border:       "1px solid rgba(52,199,89,0.3)",
        borderRadius: 16,
        padding:      "24px 20px",
        textAlign:    "center",
      }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
        <div style={{ fontSize: 18, fontWeight: 800, color: C.green, marginBottom: 8 }}>
          Order Fully Paid!
        </div>
        <div style={{ fontSize: 14, color: C.sub }}>
          Thank you, {customer.name}. Your order is settled.
        </div>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div style={{
        background:   "rgba(52,199,89,0.1)",
        border:       "1px solid rgba(52,199,89,0.3)",
        borderRadius: 16,
        padding:      "24px 20px",
        textAlign:    "center",
      }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
        <div style={{ fontSize: 18, fontWeight: 800, color: C.green, marginBottom: 8 }}>
          Payment Received!
        </div>
        <div style={{ fontSize: 14, color: C.sub, lineHeight: 1.6 }}>
          ₦{balance.toLocaleString("en-NG")} confirmed.
          {tailor.shop} has been notified automatically.
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

      {/* ── Amount due banner ── */}
      <div style={{
        background:   C.s1,
        border:       "1px solid #E5E5EA",
        borderRadius: 16,
        padding:      "18px 20px",
        display:      "flex",
        justifyContent: "space-between",
        alignItems:   "center",
      }}>
        <div style={{ fontSize: 14, color: C.sub, fontWeight: 600 }}>Amount Due</div>
        <div style={{ fontSize: 26, fontWeight: 900, color: C.text, letterSpacing: "-0.5px" }}>
          ₦{balance.toLocaleString("en-NG")}
        </div>
      </div>

      {/* ── Tab switcher ── */}
      {hasVA && (
        <div style={{
          display:       "grid",
          gridTemplateColumns: "1fr 1fr",
          gap:           4,
          background:    C.s3,
          borderRadius:  12,
          padding:       4,
        }}>
          {[
            { key: "transfer", label: "🏦 Bank Transfer" },
            { key: "card",     label: "💳 Card / Paystack" },
          ].map(t => (
            <button key={t.key} onClick={() => setActiveTab(t.key)} style={{
              padding:      "10px",
              borderRadius: 10,
              border:       "none",
              cursor:       "pointer",
              fontSize:     13,
              fontWeight:   700,
              background:   activeTab === t.key ? C.s1 : "transparent",
              color:        activeTab === t.key ? C.text : C.sub,
              boxShadow:    activeTab === t.key ? "0 1px 4px rgba(0,0,0,0.1)" : "none",
              transition:   "all 0.15s",
              fontFamily:   "inherit",
            }}>
              {t.label}
            </button>
          ))}
        </div>
      )}

      {/* ── Bank Transfer tab ── */}
      {(activeTab === "transfer" || !hasVA) && (
        <>
          {hasVA ? (
            <div style={{
              background:   C.s1,
              border:       "1px solid #E5E5EA",
              borderRadius: 16,
              overflow:     "hidden",
            }}>
              <div style={{
                background:   "#F0F7FF",
                padding:      "14px 20px",
                borderBottom: "1px solid #E5E5EA",
              }}>
                <div style={{ fontSize: 12, color: C.accent, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  Transfer to this account
                </div>
              </div>
              {[
                { label: "Bank",           value: tailor.virtual_bank_name },
                { label: "Account Number", value: tailor.virtual_account_number, mono: true, large: true },
                { label: "Account Name",   value: tailor.virtual_account_name },
                { label: "Amount",         value: `₦${balance.toLocaleString("en-NG")}`, highlight: true },
                { label: "Reference",      value: `${customer.name}`, sub: true },
              ].map(r => (
                <div key={r.label} style={{
                  display:       "flex",
                  justifyContent: "space-between",
                  alignItems:    "center",
                  padding:       "12px 20px",
                  borderBottom:  "1px solid #F0F0F0",
                }}>
                  <div style={{ fontSize: 13, color: C.sub, fontWeight: 500 }}>{r.label}</div>
                  <div style={{
                    fontSize:     r.large ? 20 : 14,
                    fontWeight:   r.large || r.highlight ? 900 : 600,
                    color:        r.highlight ? C.accent : C.text,
                    fontFamily:   r.mono ? "monospace, monospace" : "inherit",
                    letterSpacing: r.large ? "2px" : "normal",
                  }}>
                    {r.value || "—"}
                  </div>
                </div>
              ))}

              {/* Copy button */}
              <div style={{ padding: "16px 20px" }}>
                <button onClick={copyDetails} style={{
                  width:        "100%",
                  padding:      "14px",
                  borderRadius: 12,
                  border:       `1px solid ${copied ? C.green : C.border}`,
                  background:   copied ? "rgba(52,199,89,0.08)" : C.s2,
                  color:        copied ? C.green : C.text,
                  fontSize:     15,
                  fontWeight:   700,
                  cursor:       "pointer",
                  transition:   "all 0.2s",
                  fontFamily:   "inherit",
                }}>
                  {copied ? "✅ Copied!" : "📋 Copy Account Details"}
                </button>
              </div>
            </div>
          ) : (
            <div style={{
              background:   "#FFF8E8",
              border:       "1px solid rgba(255,159,10,0.3)",
              borderRadius: 14,
              padding:      "16px 20px",
              fontSize:     14,
              color:        C.sub,
              lineHeight:   1.6,
            }}>
              <strong style={{ color: "#FF9F0A" }}>Virtual account not set up yet.</strong>
              <br />Please contact {tailor.shop} directly to arrange payment.
              {tailor.phone && (
                <div style={{ marginTop: 8 }}>
                  📞 <a href={`tel:${tailor.phone}`} style={{ color: C.accent, fontWeight: 700 }}>{tailor.phone}</a>
                </div>
              )}
            </div>
          )}

          <div style={{ fontSize: 12, color: C.sub, textAlign: "center", lineHeight: 1.5 }}>
            After transferring, your payment is confirmed automatically.
            <br/>No need to send any proof.
          </div>
        </>
      )}

      {/* ── Card / Paystack tab ── */}
      {activeTab === "card" && hasVA && (
        <>
          <button
            onClick={handleCardPay}
            disabled={!sdkReady || status === "loading"}
            style={{
              background:    status === "loading" ? C.s3 : C.accent,
              color:         status === "loading" ? C.sub : "#fff",
              border:        "none",
              borderRadius:  14,
              padding:       "18px 24px",
              fontSize:      17,
              fontWeight:    800,
              cursor:        status === "loading" ? "not-allowed" : "pointer",
              width:         "100%",
              letterSpacing: "-0.3px",
              transition:    "opacity 0.15s",
              fontFamily:    "inherit",
            }}
          >
            {status === "loading"
              ? "Opening Paystack…"
              : `💳 Pay ₦${balance.toLocaleString("en-NG")} with Card`}
          </button>

          {(status === "error" || status === "no_key") && (
            <div style={{ fontSize: 13, color: C.red, textAlign: "center" }}>
              {status === "no_key"
                ? "Card payment not configured. Please use bank transfer above."
                : "Paystack is loading. Please try again in a moment."}
            </div>
          )}

          <div style={{ fontSize: 12, color: C.sub, textAlign: "center", lineHeight: 1.5 }}>
            🔒 Secured by Paystack · Card details never shared with the shop
          </div>
        </>
      )}

      {/* Footer note */}
      <div style={{
        fontSize:    12,
        color:       C.sub,
        textAlign:   "center",
        marginTop:   4,
        lineHeight:  1.5,
      }}>
        Powered by <strong style={{ color: C.text }}>BOSS</strong> · Build Trust. Grow Faster.
      </div>
    </div>
  );
}
