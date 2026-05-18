// src/lib/paystack.js
// ─────────────────────────────────────────────────────────────────
//  Paystack popup helper — BOSS v5
//
//  ARCHITECTURE NOTE:
//  Money from the popup goes to BOSS's Paystack balance.
//  The webhook (dedicatedaccount.transfer.success / charge.success)
//  then credits the tailor's wallet_balance on the tailors table.
//  BOSS does NOT use Paystack subaccounts — they are removed.
//
//  Primary payment method: bank transfer to Dedicated Virtual Account
//  Secondary: this Paystack popup (card / Paystack bank transfer)
// ─────────────────────────────────────────────────────────────────

let sdkLoaded = false;

function loadPaystackSDK() {
  if (sdkLoaded || typeof window === "undefined") return;
  const s    = document.createElement("script");
  s.src      = "https://js.paystack.co/v1/inline.js";
  s.async    = true;
  document.head.appendChild(s);
  sdkLoaded  = true;
}

/**
 * Open the Paystack payment popup.
 *
 * @param {object} options
 * @param {string}   options.email        Customer email (required by Paystack)
 * @param {number}   options.amount       Amount in NGN (we convert to kobo)
 * @param {string}   options.name         Customer display name
 * @param {string}   options.phone        Customer phone number
 * @param {string}   options.ref          Unique reference (BOSS_<orderId>_<timestamp>)
 * @param {function} options.onSuccess    Called with reference on success
 * @param {function} options.onClose      Called when popup is closed without payment
 */
export function openPaystackPopup({ email, amount, name, phone, ref, onSuccess, onClose }) {
  loadPaystackSDK();

  const publicKey = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY;

  if (!publicKey) {
    console.warn("[paystack] NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY not set — popup blocked.");
    alert("Paystack is not configured. Add NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY to .env.local");
    return;
  }

  // Wait for SDK to load (up to 3 seconds)
  let attempts = 0;
  const interval = setInterval(() => {
    attempts++;
    if (typeof window.PaystackPop !== "undefined") {
      clearInterval(interval);
      _openPopup();
    }
    if (attempts > 30) {
      clearInterval(interval);
      alert("Paystack failed to load. Check your internet connection and try again.");
    }
  }, 100);

  function _openPopup() {
    const handler = window.PaystackPop.setup({
      key:      publicKey,
      email:    email || `${(phone || "customer").replace(/\D/g, "")}@boss.app`,
      amount:   Math.round((amount || 0) * 100),   // NGN → kobo
      currency: "NGN",
      ref:      ref || "BOSS_" + Date.now(),
      metadata: {
        custom_fields: [
          { display_name:"Customer", variable_name:"customer_name", value: name  || "" },
          { display_name:"Phone",    variable_name:"phone",         value: phone || "" },
        ],
      },
      // NO subaccount_code — money goes to BOSS Paystack balance.
      // Webhook credits the tailor's wallet_balance.
      callback: (response) => { onSuccess && onSuccess(response.reference); },
      onClose:  ()         => { onClose   && onClose();                     },
    });
    handler.openIframe();
  }
}
