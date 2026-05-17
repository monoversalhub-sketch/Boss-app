// src/lib/paystack.js
// ─────────────────────────────────────────────────────────────────
//  BOSS — Paystack Integration (Virtual Accounts Only)
//
//  HOW MONEY FLOWS:
//  Each tailor gets a Paystack Dedicated Virtual Account.
//  Customers pay by bank transfer → money goes straight to tailor's bank.
//  BOSS never holds funds.
//
//  Virtual Account flow:
//    Customer → Bank Transfer → Tailor's Virtual Account → Tailor's Bank
//    dedicatedaccount.transfer.success webhook → order auto-updated
//
//  Online payment (invoice link / popup):
//    Customer → Paystack Checkout → fires charge.success webhook
//    → order auto-updated in BOSS
// ─────────────────────────────────────────────────────────────────

const PUBLIC_KEY = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || "";

// ── Load the Paystack inline SDK once ────────────────────────────
let sdkLoaded = false;
function loadPaystackSDK() {
  if (sdkLoaded || typeof window === "undefined") return;
  const script    = document.createElement("script");
  script.src      = "https://js.paystack.co/v1/inline.js";
  script.async    = true;
  document.head.appendChild(script);
  sdkLoaded = true;
}

// ── Open Paystack payment popup ───────────────────────────────────
export function openPaystackPopup({
  email, amount, name, phone, ref, onSuccess, onClose,
}) {
  loadPaystackSDK();

  const tryOpen = (attempts = 0) => {
    if (!window.PaystackPop) {
      if (attempts > 20) {
        alert("Paystack could not load. Please check your internet connection.");
        return;
      }
      setTimeout(() => tryOpen(attempts + 1), 200);
      return;
    }

    if (!PUBLIC_KEY) {
      alert("Paystack is not configured. Add NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY to your environment.");
      return;
    }

    const config = {
      key:      PUBLIC_KEY,
      email:    email || `${(phone || "customer").replace(/\D/g, "")}@boss.app`,
      amount:   Math.round(amount * 100),   // ₦ → kobo
      currency: "NGN",
      ref:      ref || "BOSS_" + Date.now(),
      metadata: {
        custom_fields: [
          { display_name: "Customer", variable_name: "customer_name", value: name  || "" },
          { display_name: "Phone",    variable_name: "phone",         value: phone || "" },
        ],
      },
      callback: (response) => { onSuccess && onSuccess(response.reference); },
      onClose:  ()         => { onClose   && onClose(); },
    };

    window.PaystackPop.setup(config).openIframe();
  };

  tryOpen();
}

// ── Generate a shareable Paystack payment link (for WhatsApp) ─────
export function paystackLink({ amount, email, name, ref }) {
  const params = new URLSearchParams({
    amount:    Math.round(amount * 100),
    email:     email || "customer@boss.app",
    firstname: (name || "").split(" ")[0],
    lastname:  (name || "").split(" ").slice(1).join(" ") || "",
    ref:       ref || "BOSS_" + Date.now(),
    currency:  "NGN",
    key:       PUBLIC_KEY,
  });
  return `https://checkout.paystack.com/pay?${params.toString()}`;
}
