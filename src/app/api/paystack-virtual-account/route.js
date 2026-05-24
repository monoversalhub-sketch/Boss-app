// src/app/api/paystack-virtual-account/route.js
// Creates a Paystack Dedicated Virtual Account for a tailor.
//
// ARCHITECTURE:
// Each tailor gets a unique virtual account (Wema Bank or Titan Trust).
// Customers pay by bank transfer → auto-credited to tailor's BOSS wallet.
//
// FIXES in v7:
// - dva_id is now saved (required for deactivation)
// - Deterministic Paystack customer email (prevents duplicate customers on retry)
// - Provider availability check before creation attempt
// - Structured response includes dva_id
//
// POST /api/paystack-virtual-account
// Body: { business_name, phone? }

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const PREFERRED_BANKS = ["wema-bank", "titan-paystack-bank"];

// DVA NAMING CONVENTION (per BOSS naming research doc)
// Format: first_name="BOSS", last_name=cleanedShopName (max 18 chars)
// Customer sees: "BOSS BY MNVSL / BOSS [SHOP NAME]"
// This gives both the BOSS brand AND the tailor's shop identity.
function buildDVAName(shopName) {
  const clean = (shopName || "BUSINESS")
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, "")   // only letters, numbers, spaces
    .replace(/\s+/g, " ")
    .trim();
  const shop = clean.length > 18 ? clean.slice(0, 18).trim() : clean;
  return { first_name: "BOSS", last_name: shop || "BUSINESS" };
}

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
    console.warn("[virtual-account] No PAYSTACK_SECRET_KEY — returning mock.");
    return NextResponse.json({
      ok:                     true,
      dva_id:                 "mock_dva_" + Date.now(),
      virtual_account_number: "9" + Math.floor(Math.random() * 900000000 + 100000000),
      virtual_bank_name:      "Wema Bank",
      virtual_account_name:   business_name.trim(),
      virtual_account_status: "active",
      customer_code:          "CUS_mock_" + Date.now(),
      _mock:                  true,
    });
  }

  try {
    // C-7: Check which banks are currently accepting DVA creation
    let banksToTry = PREFERRED_BANKS;
    try {
      const providersRes = await fetch(
        "https://api.paystack.co/dedicated_account/available_providers",
        { headers: { Authorization: `Bearer ${secretKey}` } }
      );
      const providersData = await providersRes.json();
      const available = (providersData.data || []).map(p => p.provider_slug);
      if (available.length > 0) {
        banksToTry = PREFERRED_BANKS.filter(b => available.includes(b));
        if (banksToTry.length === 0) {
          return NextResponse.json({
            error: "Virtual account service is temporarily unavailable. Paystack's banking partners are experiencing delays. Please try again later.",
          }, { status: 503 });
        }
      }
    } catch {
      // If providers check fails, proceed with default list
      console.warn("[virtual-account] Could not fetch providers — using defaults.");
    }

    // C-6: Deterministic Paystack customer email based on user session
    let uid = Date.now().toString();
    try {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.id) uid = user.id.replace(/-/g, "").slice(0, 16);
    } catch { /* offline/local mode — use timestamp */ }

    const email = `tailor_${uid}@boss-monoversal.com`;

    // STEP 1: Create Paystack Customer using DVA naming convention
    const { first_name, last_name } = buildDVAName(business_name);
    const custRes = await fetch("https://api.paystack.co/customer", {
      method: "POST",
      headers: { Authorization: `Bearer ${secretKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        first_name,
        last_name,
        phone: phone || "",
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

    // STEP 2: Assign Dedicated Virtual Account
    let vaData = null;
    for (const bank of banksToTry) {
      const vaRes = await fetch("https://api.paystack.co/dedicated_account", {
        method: "POST",
        headers: { Authorization: `Bearer ${secretKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ customer: customerCode, preferred_bank: bank }),
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
        error: "Could not assign a virtual account. Make sure Dedicated Virtual Accounts are enabled on your Paystack account, then try again.",
      }, { status: 400 });
    }

    // STEP 3: Return structured response — INCLUDING dva_id for deactivation
    return NextResponse.json({
      ok:                     true,
      dva_id:                 String(vaData.data.id),          // C-1: CRITICAL — needed for deactivate
      virtual_account_number: vaData.data.account_number,
      virtual_bank_name:      vaData.data.bank?.name || "Wema Bank",
      virtual_account_name:   vaData.data.account_name || business_name.trim(),
      virtual_account_status: "active",
      customer_code:          customerCode,
    });

  } catch (err) {
    console.error("[virtual-account] Error:", err);
    return NextResponse.json({ error: "Server error creating virtual account. Try again." }, { status: 500 });
  }
}
