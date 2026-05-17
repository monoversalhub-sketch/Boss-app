// src/app/api/paystack-virtual-account/route.js
// Creates a dedicated virtual account for a tailor via Paystack
// Doc: https://paystack.com/docs/payments/dedicated-virtual-accounts/
import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const { business_name, bank_code, account_number, account_name } = await request.json();

    if (!business_name) {
      return NextResponse.json({ error: "Business name is required." }, { status: 400 });
    }

    const secretKey = process.env.PAYSTACK_SECRET_KEY;
    if (!secretKey) {
      // Dev fallback — return mock virtual account
      return NextResponse.json({
        ok: true,
        virtual_account_number: account_number,
        virtual_bank_name: "Wema Bank",
        virtual_account_name: account_name || business_name,
        virtual_account_status: "active",
      });
    }

    // Step 1: Create a Paystack customer
    const customerRes = await fetch("https://api.paystack.co/customer", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: `va_${Date.now()}@boss-app.com`,
        first_name: business_name.split(" ")[0] || business_name,
        last_name: business_name.split(" ").slice(1).join(" ") || "Business",
        phone: "",
      }),
    });

    const customerData = await customerRes.json();
    if (!customerData.status) {
      return NextResponse.json({ error: customerData.message || "Failed to create customer." }, { status: 400 });
    }

    const customerCode = customerData.data?.customer_code;

    // Step 2: Create dedicated virtual account
    const vaRes = await fetch("https://api.paystack.co/dedicated_account", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        customer: customerCode,
        preferred_bank: "wema-bank", // Paystack supports wema-bank for dedicated accounts
      }),
    });

    const vaData = await vaRes.json();

    if (!vaData.status) {
      // Fallback: use the verified bank account as manual virtual account
      return NextResponse.json({
        ok: true,
        virtual_account_number: account_number,
        virtual_bank_name: "Manual",
        virtual_account_name: account_name || business_name,
        virtual_account_status: "manual",
        note: vaData.message,
      });
    }

    return NextResponse.json({
      ok: true,
      virtual_account_number: vaData.data?.account_number,
      virtual_bank_name: vaData.data?.bank?.name || "Wema Bank",
      virtual_account_name: vaData.data?.account_name || business_name,
      virtual_account_status: "active",
      customer_code: customerCode,
    });

  } catch (err) {
    console.error("Virtual account error:", err);
    return NextResponse.json({ error: "Failed to create virtual account." }, { status: 500 });
  }
}
