// src/app/api/paystack-verify-account/route.js
// ─────────────────────────────────────────────────────────────────
//  Verifies a Nigerian bank account number using Paystack's
//  resolve endpoint. Called from the Profile tab when a tailor
//  enters their bank details — shows their account name before
//  they confirm, preventing errors.
//
//  GET /api/paystack-verify-account?account_number=XXXXXXXXXX&bank_code=XXX
// ─────────────────────────────────────────────────────────────────

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const account_number   = searchParams.get("account_number");
  const bank_code        = searchParams.get("bank_code");

  if (!account_number || !bank_code) {
    return Response.json({ error: "account_number and bank_code are required" }, { status: 400 });
  }

  if (account_number.length !== 10) {
    return Response.json({ error: "Account number must be exactly 10 digits" }, { status: 400 });
  }

  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  if (!secretKey) {
    return Response.json({ error: "PAYSTACK_SECRET_KEY not configured on server" }, { status: 500 });
  }

  try {
    const res = await fetch(
      `https://api.paystack.co/bank/resolve?account_number=${account_number}&bank_code=${bank_code}`,
      {
        headers: {
          Authorization: `Bearer ${secretKey}`,
          "Content-Type": "application/json",
        },
      }
    );

    const data = await res.json();

    if (!res.ok || !data.status) {
      return Response.json(
        { error: data.message || "Could not verify account. Please check the details." },
        { status: 400 }
      );
    }

    // Return only what the UI needs
    return Response.json({
      account_name:   data.data.account_name,
      account_number: data.data.account_number,
    });

  } catch (err) {
    console.error("[paystack-verify-account]", err);
    return Response.json({ error: "Network error verifying account" }, { status: 500 });
  }
}
