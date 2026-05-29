"use client";
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
  const [sdkReady, setSdkReady] = useState(false);
  const [status, setStatus] = useState("idle");

  const balance = Math.max(0, order.price - order.deposit - order.paid);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.PaystackPop) { setSdkReady(true); return; }
    const s = document.createElement("script");
    s.src = "https://js.paystack.co/v1/inline.js";
    s.async = true;
    s.onload = () => setSdkReady(true);
    document.head.appendChild(s);
  }, []);

  function handleCardPay() {
    if (!sdkReady || !window.PaystackPop) { setStatus("error"); return; }
    if (!publicKey) { setStatus("no_key"); return; }

    setStatus("loading");
    const config = {
      key:      publicKey,
      email:    customer.phone
                  ? `${customer.phone.replace(/\D/g, "")}@boss.app`
                  : "customer@boss.app",
      amount:   Math.round(balance * 100),
      currency: "NGN",
      ref:      `BOSS_${order.id}_${Date.now()}`,
      metadata: {
        custom_fields: [
          { display_name: "Shop",     variable_name: "shop",     value: tailor.shop },
          { display_name: "Customer", variable_name: "customer", value: customer.name },
          { display_name: "Item",     variable_name: "item",     value: order.type || "Order" },
        ],
      },
      callback: () => { setStatus("success"); },
      onClose:  () => { setStatus("idle"); },
    };
    window.PaystackPop.setup(config).openIframe();
  }

  if (balance <= 0) {
    return (
      <div style={{
        background: "rgba(52,199,89,0.1)", border: "1px solid rgba(52,199,89,0.3)",
        borderRadius: 16, padding: "24px 20px", textAlign: "center",
      }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
        <div style={{ fontSize: 18, fontWeight: 800, color: C.green, marginBottom: 8 }}>Order Fully Paid!</div>
        <div style={{ fontSize: 14, color: C.sub }}>Thank you, {customer.name}. Your order is settled.</div>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div style={{
        background: "rgba(52,199,89,0.1)", border: "1px solid rgba(52,199,89,0.3)",
        borderRadius: 16, padding: "24px 20px", textAlign: "center",
      }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
        <div style={{ fontSize: 18, fontWeight: 800, color: C.green, marginBottom: 8 }}>Payment Received!</div>
        <div style={{ fontSize: 14, color: C.sub, lineHeight: 1.6 }}>
          ₦{balance.toLocaleString("en-NG")} confirmed. {tailor.shop} has been notified automatically.
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

      <div style={{
        background: C.s1, border: "1px solid #E5E5EA", borderRadius: 16,
        padding: "18px 20px", display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <div style={{ fontSize: 14, color: C.sub, fontWeight: 600 }}>Amount Due</div>
        <div style={{ fontSize: 26, fontWeight: 900, color: C.text, letterSpacing: "-0.5px" }}>
          ₦{balance.toLocaleString("en-NG")}
        </div>
      </div>

      <button
        onClick={handleCardPay}
        disabled={!sdkReady || status === "loading"}
        style={{
          background: status === "loading" ? C.s3 : C.accent,
          color: status === "loading" ? C.sub : "#fff",
          border: "none", borderRadius: 14, padding: "18px 24px",
          fontSize: 17, fontWeight: 800, cursor: status === "loading" ? "not-allowed" : "pointer",
          width: "100%", letterSpacing: "-0.3px", transition: "opacity 0.15s", fontFamily: "inherit",
        }}>
        {status === "loading"
          ? "Opening Paystack…"
          : `💳 Pay ₦${balance.toLocaleString("en-NG")} with Card`}
      </button>

      {(status === "error" || status === "no_key") && (
        <div style={{ fontSize: 13, color: C.red, textAlign: "center" }}>
          {status === "no_key"
            ? "Card payment not configured. Please contact the shop."
            : "Paystack is loading. Please try again in a moment."}
        </div>
      )}

      <div style={{ fontSize: 12, color: C.sub, textAlign: "center", lineHeight: 1.5 }}>
        🔒 Secured by Paystack · Card details never shared with the shop
      </div>

      <div style={{ fontSize: 12, color: C.sub, textAlign: "center", marginTop: 4, lineHeight: 1.5 }}>
        Powered by <strong style={{ color: C.text }}>BOSS</strong> · Build Trust. Grow Faster.
      </div>
    </div>
  );
}
