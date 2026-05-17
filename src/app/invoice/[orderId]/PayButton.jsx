"use client";
// src/app/invoice/[orderId]/PayButton.jsx
// ─────────────────────────────────────────────────────────────────
//  Handles the "Pay Now" button on the public invoice page.
//  Loads Paystack, opens the popup, and updates the order on success.
// ─────────────────────────────────────────────────────────────────
import { useState, useEffect } from "react";

const C = {
  bg:     "#080808",
  gold:   "#E8B84B",
  green:  "#2EC4A0",
  red:    "#F05454",
  sub:    "#777",
  s2:     "#181818",
  border: "#2a2a2a",
};

export default function PayButton({ order, customer, tailor, publicKey }) {
  const [sdkReady,  setSdkReady]  = useState(false);
  const [status,    setStatus]    = useState("idle");
  // status: "idle" | "loading" | "success" | "error"
  const [message,   setMessage]   = useState("");

  const balance = Math.max(0, order.price - order.deposit - order.paid);

  // Load Paystack SDK on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.PaystackPop) { setSdkReady(true); return; }
    const script   = document.createElement("script");
    script.src     = "https://js.paystack.co/v1/inline.js";
    script.async   = true;
    script.onload  = () => setSdkReady(true);
    document.head.appendChild(script);
  }, []);

  function handlePay() {
    if (!sdkReady || !window.PaystackPop) {
      setMessage("Paystack is loading, please try again in a moment.");
      return;
    }
    if (!publicKey) {
      setMessage("Payment is not configured. Please contact the shop.");
      return;
    }
    if (balance <= 0) {
      setMessage("This order is fully paid. Thank you!");
      return;
    }

    setStatus("loading");

    const config = {
      key:      publicKey,
      email:    customer.phone
                  ? `${customer.phone.replace(/\D/g, "")}@boss.app`
                  : "customer@boss.app",
      amount:   Math.round(balance * 100),   // ₦ → kobo
      currency: "NGN",
      ref:      `BOSS_${order.id}_${Date.now()}`,
      metadata: {
        custom_fields: [
          { display_name: "Shop",     variable_name: "shop_name",     value: tailor.shop },
          { display_name: "Customer", variable_name: "customer_name", value: customer.name },
          { display_name: "Item",     variable_name: "order_type",    value: order.type || "Order" },
        ],
      },
      callback: async (response) => {
        setStatus("loading");
        setMessage("Confirming payment…");
        // Webhook handles the DB update automatically.
        // We just show the success state here.
        setStatus("success");
        setMessage(`✅ Payment of ₦${balance.toLocaleString("en-NG")} received! Thank you, ${customer.name}.`);
      },
      onClose: () => {
        setStatus("idle");
        setMessage("Payment cancelled.");
      },
    };

    window.PaystackPop.setup(config).openIframe();
  }

  if (status === "success") {
    return (
      <div style={{
        background: "rgba(46,196,160,0.1)",
        border:     `1px solid ${C.green}44`,
        borderRadius: 16,
        padding:    "24px 20px",
        textAlign:  "center",
      }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
        <div style={{ fontWeight: 800, fontSize: 18, color: C.green, marginBottom: 8 }}>
          Payment Confirmed!
        </div>
        <div style={{ fontSize: 14, color: C.sub, lineHeight: 1.6 }}>
          {message}
        </div>
        <div style={{ fontSize: 12, color: C.sub, marginTop: 12 }}>
          The shop will be notified automatically.
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {balance > 0 ? (
        <button
          onClick={handlePay}
          disabled={!sdkReady || status === "loading"}
          style={{
            background:    status === "loading" ? C.s2 : C.gold,
            color:         status === "loading" ? C.sub : "#000",
            border:        "none",
            borderRadius:  14,
            padding:       "18px 24px",
            fontSize:      17,
            fontWeight:    800,
            cursor:        status === "loading" ? "not-allowed" : "pointer",
            width:         "100%",
            letterSpacing: "-0.3px",
            transition:    "opacity 0.15s",
          }}
        >
          {status === "loading"
            ? "Processing…"
            : `💳 Pay ₦${balance.toLocaleString("en-NG")} Balance`}
        </button>
      ) : (
        <div style={{
          background:   "rgba(46,196,160,0.1)",
          border:       `1px solid ${C.green}44`,
          borderRadius: 14,
          padding:      "16px 20px",
          textAlign:    "center",
          color:        C.green,
          fontWeight:   700,
          fontSize:     15,
        }}>
          ✅ This order is fully paid
        </div>
      )}

      {message && status !== "success" && (
        <div style={{ fontSize: 13, color: C.sub, textAlign: "center" }}>
          {message}
        </div>
      )}

      <div style={{ fontSize: 12, color: C.sub, textAlign: "center", lineHeight: 1.5 }}>
        🔒 Secured by Paystack · Your card details are never shared with the shop
      </div>
    </div>
  );
}
