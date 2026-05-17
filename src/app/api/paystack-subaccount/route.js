// src/app/api/paystack-subaccount/route.js
// ─────────────────────────────────────────────────────────────────
//  Creates a Paystack Subaccount for a tailor.
//
//  What a Subaccount does:
//  ─────────────────────────────────────────────────────────────────
//  A Paystack Subaccount represents the tailor's bank account on
//  the Paystack platform. Once created, any charge that includes
//  the tailor's subaccount_code will route the payment directly
//  into their bank account — Paystack handles it automatically.
//
//  This endpoint is called from the Profile tab when a tailor
//  saves their bank details for the first time.
//
//  POST /api/paystack-subaccount
//  Body: { business_name, bank_code, account_number }
// ─────────────────────────────────────────────────────────────────

export async function POST(request) {
  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  if (!secretKey) {
    return Response.json({ error: "PAYSTACK_SECRET_KEY not configured on server" }, { status: 500 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { business_name, bank_code, account_number } = body;

  if (!business_name || !bank_code || !account_number) {
    return Response.json(
      { error: "business_name, bank_code, and account_number are all required" },
      { status: 400 }
    );
  }

  try {
    const res = await fetch("https://api.paystack.co/subaccount", {
      method: "POST",
      headers: {
        Authorization:  `Bearer ${secretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        business_name:     business_name,
        settlement_bank:   bank_code,
        account_number:    account_number,
        // percentage_charge: 0 means BOSS takes 0% — the tailor keeps everything
        // (Paystack still takes their own 1.5% fee from the transaction)
        percentage_charge: 0,
      }),
    });

    const data = await res.json();

    if (!res.ok || !data.status) {
      return Response.json(
        { error: data.message || "Paystack could not create the subaccount. Check your bank details." },
        { status: 400 }
      );
    }

    // Return the subaccount code — this is what gets saved to the tailor's profile
    return Response.json({
      subaccount_code: data.data.subaccount_code,
      id:              data.data.id,
    });

  } catch (err) {
    console.error("[paystack-subaccount]", err);
    return Response.json({ error: "Network error creating subaccount" }, { status: 500 });
  }
}
