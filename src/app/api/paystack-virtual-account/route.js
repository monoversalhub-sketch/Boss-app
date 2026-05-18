// src/app/api/paystack-virtual-account/route.js
// ─────────────────────────────────────────────────────────────────
//  Creates a Paystack Dedicated Virtual Account for a tailor.
//
//  ARCHITECTURE (per BOSS master doc):
//  ─────────────────────────────────────────────────────────────────
//  Each tailor gets a unique virtual account number (Wema Bank or
//  Titan Trust via Paystack). Customers pay into this account via
//  direct bank transfer. Money lands in the tailor's BOSS wallet
//  balance. The tailor withdraws to their real bank at their
//  convenience. BOSS never auto-routes funds — the tailor is always
//  in control.
//
//  This is NOT a subaccount. Subaccounts are removed entirely.
//
//  FLOW:
//    1. Create Paystack Customer (business identity for the tailor)
//    2. Assign Dedicated Virtual Account to that customer
//       Try wema-bank first, fall back to titan-paystack-bank
//    3. Return virtual_account_number, virtual_bank_name,
//       virtual_account_name, customer_code
//
//  POST /api/paystack-virtual-account
//  Body: { business_name, phone? }
// ─────────────────────────────────────────────────────────────────

import { NextResponse } from "next/server";

const PREFERRED_BANKS = ["wema-bank", "titan-paystack-bank"];

export async function POST(request) {
  let body;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "Invalid request body." }, { status: 400 }); }

  const { business_name, phone } = body;

  if (!business_name?.trim()) {
    return NextResponse.json({ error: "Business name is required." }, { status: 400 });
  }

  const secretKey = process.env.PAYSTACK_SECRET_KEY;

  // DEV fallback — no key set
  if (!secretKey) {
    console.warn("[virtual-account] No PAYSTACK_SECRET_KEY — returning mock account.");
    return NextResponse.json({
      ok:                     true,
      virtual_account_number: "9" + Math.floor(Math.random() * 900000000 + 100000000),
      virtual_bank_name:      "Wema Bank",
      virtual_account_name:   business_name.trim(),
      virtual_account_status: "active",
      customer_code:          "CUS_mock_" + Date.now(),
      _mock:                  true,
    });
  }

  try {
    // STEP 1: Create Paystack Customer
    const nameParts = business_name.trim().split(" ");
    const custRes   = await fetch("https://api.paystack.co/customer", {
      method:  "POST",
      headers: {
        Authorization:  `Bearer ${secretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email:      `va_${Date.now()}@boss-monoversal.com`,
        first_name: nameParts[0] || business_name.trim(),
        last_name:  nameParts.slice(1).join(" ") || "Business",
        phone:      phone || "",
      }),
    });

    const custData = await custRes.json();
    if (!custData.status || !custData.data?.customer_code) {
      console.error("[virtual-account] Customer creation failed:", custData);
      return NextResponse.json(
        { error: custData.message || "Could not register with Paystack. Try again." },
        { status: 400 }
      );
    }

    const customerCode = custData.data.customer_code;
    console.log(`[virtual-account] Customer: ${customerCode}`);

    // STEP 2: Assign Dedicated Virtual Account
    // Try preferred banks in order until one succeeds
    let vaData = null;

    for (const bank of PREFERRED_BANKS) {
      const vaRes = await fetch("https://api.paystack.co/dedicated_account", {
        method:  "POST",
        headers: {
          Authorization:  `Bearer ${secretKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          customer:       customerCode,
          preferred_bank: bank,
        }),
      });
      const parsed = await vaRes.json();

      if (parsed.status && parsed.data?.account_number) {
        vaData = parsed;
        console.log(`[virtual-account] VA on ${bank}: ${parsed.data.account_number}`);
        break;
      }
      console.warn(`[virtual-account] ${bank} failed:`, parsed.message);
    }

    if (!vaData) {
      return NextResponse.json({
        error:
          "Could not assign a virtual account. Make sure Dedicated Virtual Accounts are enabled on your Paystack account, then try again.",
      }, { status: 400 });
    }

    // STEP 3: Return structured response
    return NextResponse.json({
      ok:                     true,
      virtual_account_number: vaData.data.account_number,
      virtual_bank_name:      vaData.data.bank?.name || "Wema Bank",
      virtual_account_name:   vaData.data.account_name || business_name.trim(),
      virtual_account_status: "active",
      customer_code:          customerCode,
    });

  } catch (err) {
    console.error("[virtual-account] Error:", err);
    return NextResponse.json(
      { error: "Server error creating virtual account. Try again." },
      { status: 500 }
    );
  }
}
