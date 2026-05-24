// src/app/api/paystack-requery-virtual-account/route.js
// Triggers a Paystack background scan for missed/pending transfers.
// Paystack fires the webhook for any unprocessed transactions found.
// Use when tailor says "I sent money but it's not showing."
// Body: { account_number: "XXXXXXXXXX", provider_slug: "wema-bank" }
import { NextResponse } from "next/server";

export async function POST(request) {
  let body;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "Invalid request body." }, { status: 400 }); }

  const { account_number, provider_slug } = body;
  if (!account_number || !provider_slug) {
    return NextResponse.json(
      { error: "account_number and provider_slug are required." },
      { status: 400 }
    );
  }

  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  if (!secretKey) {
    return NextResponse.json({
      ok: true,
      message: "Requery triggered. Check your wallet in a moment.",
      _mock: true,
    });
  }

  try {
    const res = await fetch(
      `https://api.paystack.co/dedicated_account/requery?account_number=${account_number}&provider_slug=${provider_slug}`,
      { headers: { Authorization: `Bearer ${secretKey}` } }
    );
    const data = await res.json();
    return NextResponse.json({
      ok: data.status,
      message: data.message || "Requery triggered. Check your wallet in a moment.",
    });
  } catch {
    return NextResponse.json({ error: "Requery failed. Try again." }, { status: 500 });
  }
}
