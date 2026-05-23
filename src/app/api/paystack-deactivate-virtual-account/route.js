// src/app/api/paystack-deactivate-virtual-account/route.js
// Deactivates the tailor's Paystack DVA permanently.
// The tailor can then request a new DVA.
// Body: { dva_id: "12345" }  ← Paystack internal DVA id
import { NextResponse } from "next/server";

export async function POST(request) {
  let body;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "Invalid request body." }, { status: 400 }); }

  const { dva_id } = body;
  if (!dva_id) return NextResponse.json({ error: "dva_id is required." }, { status: 400 });

  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  if (!secretKey) {
    // Dev fallback — mock success
    return NextResponse.json({ ok: true, _mock: true });
  }

  try {
    const res = await fetch(
      `https://api.paystack.co/dedicated_account/deactivate/${dva_id}`,
      { method: "DELETE", headers: { Authorization: `Bearer ${secretKey}` } }
    );
    const data = await res.json();
    if (!data.status) {
      return NextResponse.json(
        { error: data.message || "Could not deactivate virtual account." },
        { status: 400 }
      );
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[deactivate-va]", err);
    return NextResponse.json({ error: "Server error. Try again." }, { status: 500 });
  }
}
