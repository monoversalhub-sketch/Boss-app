// src/lib/paystack.js
// ─────────────────────────────────────────────────────────────────
//  BOSS — Paystack Integration
//
//  HOW MONEY FLOWS:
//  ─────────────────────────────────────────────────────────────────
//  Each tailor registers their bank account during setup.
//  BOSS creates a Paystack Subaccount for them — this is a Paystack
//  object that holds the tailor's bank details.
//
//  When a customer pays online:
//    Customer → Paystack → Tailor's bank account (automatically)
//
//  Paystack deducts their fee (1.5%, capped at ₦2,000) from the
//  transaction. The tailor receives the rest — directly in their
//  account, within 24–48 hours of settlement.
//
//  BOSS does NOT hold the money. It never touches the tailor's funds.
//  ─────────────────────────────────────────────────────────────────

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
//
//  Usage:
//    openPaystackPopup({
//      email:          "customer@email.com",
//      amount:         5000,              // in NAIRA (not kobo)
//      name:           "Chukwudi Obi",
//      phone:          "08012345678",
//      ref:            "BOSS-orderId-timestamp",
//      subaccountCode: "ACCT_xxxxxxxxxx",  // tailor's Paystack subaccount
//      onSuccess:      (ref) => { ... },
//      onClose:        ()    => { ... },
//    })
//
//  If subaccountCode is provided, Paystack routes the money directly
//  to the tailor's bank account. If not set (tailor hasn't added their
//  bank yet), payment still works but goes to the BOSS main account
//  and must be manually forwarded.
export function openPaystackPopup({
  email, amount, name, phone, ref, subaccountCode, onSuccess, onClose,
}) {
  loadPaystackSDK();

  // Wait for SDK to load if it was just injected
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

    // If the tailor has a Paystack subaccount, route money to them
    if (subaccountCode) {
      config.subaccount = subaccountCode;
      // "account"  → Paystack fee charged to the tailor's subaccount (tailor pays fees)
      // "subaccount" → fee charged to the main account (not used here)
      config.bearer     = "account";
    }

    window.PaystackPop.setup(config).openIframe();
  };

  tryOpen();
}

// ── Generate a shareable Paystack payment link (for WhatsApp) ─────
export function paystackLink({ amount, email, name, ref, subaccountCode }) {
  const params = new URLSearchParams({
    amount:    Math.round(amount * 100),
    email:     email || "customer@boss.app",
    firstname: (name || "").split(" ")[0],
    lastname:  (name || "").split(" ").slice(1).join(" ") || "",
    ref:       ref || "BOSS_" + Date.now(),
    currency:  "NGN",
    key:       PUBLIC_KEY,
    ...(subaccountCode && { subaccount: subaccountCode }),
  });
  return `https://checkout.paystack.com/pay?${params.toString()}`;
}
