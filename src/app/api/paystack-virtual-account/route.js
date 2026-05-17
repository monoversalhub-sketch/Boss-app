// src/app/api/paystack-virtual-account/route.js
// Creates a dedicated virtual account for a tailor via Paystack
// The shop name is used as the customer name for the virtual account.
// Doc: https://paystack.com/docs/payments/dedicated-virtual-accounts/
import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const { shop_name, phone } = await request.json();

    if (!shop_name) {
      return NextResponse.json({ error: "Shop name is required." }, { status: 400 });
    }

    const secretKey = process.env.PAYSTACK_SECRET_KEY;
    if (!secretKey) {
      // Dev fallback — return mock virtual account
      return NextResponse.json({
        ok: true,
        virtual_account_number: "0000000000",
        virtual_bank_name: "Wema Bank",
        virtual_account_name: shop_name,
        virtual_account_status: "active",
      });
    }

    // Step 1: Create a Paystack customer using the shop name
    // Split shop name into first/last for Paystack's name fields
    const nameParts = shop_name.trim().split(/\s+/);
    const firstName = nameParts[0] || shop_name;
    const lastName  = nameParts.slice(1).join(" ") || "Business";

    const customerRes = await fetch("https://api.paystack.co/customer", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email:      `va_${Date.now()}@boss-app.com`,
        first_name: firstName,
        last_name:  lastName,
        phone:      phone || "",
      }),
    });

    const customerData = await customerRes.json();
    if (!customerData.status) {
      return NextResponse.json({ error: customerData.message || "Failed to create customer." }, { status: 400 });
    }

    const customerCode = customerData.data?.customer_code;

    // Step 2: Create dedicated virtual account
    // Paystack assigns the bank (Wema Bank or Titan by Paystack)
    const vaRes = await fetch("https://api.paystack.co/dedicated_account", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        customer:       customerCode,
        preferred_bank: "wema-bank", // Paystack supports wema-bank and titan-paystack
      }),
    });

    const vaData = await vaRes.json();

    if (!vaData.status) {
      // Try titan-paystack as fallback
      const vaRes2 = await fetch("https://api.paystack.co/dedicated_account", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${secretKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          customer:       customerCode,
          preferred_bank: "titan-paystack",
        }),
      });
      const vaData2 = await vaRes2.json();

      if (!vaData2.status) {
        return NextResponse.json({
          error: vaData2.message || "Could not create virtual account. Try again later.",
        }, { status: 400 });
      }

      return NextResponse.json({
        ok:                     true,
        virtual_account_number: vaData2.data?.account_number,
        virtual_bank_name:      vaData2.data?.bank?.name || "Titan by Paystack",
        virtual_account_name:   shop_name, // always show shop name
        virtual_account_status: "active",
        customer_code:          customerCode,
      });
    }

    return NextResponse.json({
      ok:                     true,
      virtual_account_number: vaData.data?.account_number,
      virtual_bank_name:      vaData.data?.bank?.name || "Wema Bank",
      virtual_account_name:   shop_name, // always show shop name
      virtual_account_status: "active",
      customer_code:          customerCode,
    });

  } catch (err) {
    console.error("Virtual account error:", err);
    return NextResponse.json({ error: "Failed to create virtual account." }, { status: 500 });
  }
}
