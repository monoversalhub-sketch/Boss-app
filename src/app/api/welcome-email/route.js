// src/app/api/welcome-email/route.js
// ─────────────────────────────────────────────────────────────────
//  Sends a branded welcome email via Resend after first setup.
//  Resend docs: https://resend.com/docs
//  Setup:
//    1. npm install resend
//    2. Add RESEND_API_KEY to .env.local
//    3. Verify your sending domain in Resend dashboard
//    4. Update FROM_EMAIL below to your verified domain
// ─────────────────────────────────────────────────────────────────

import { NextResponse } from "next/server";

const FROM_EMAIL  = "BOSS <onboarding@yourdomain.com>"; // ← update this
const RESEND_API  = "https://api.resend.com/emails";

export async function POST(request) {
  try {
    const { email, shopName } = await request.json();

    if (!email || !shopName) {
      return NextResponse.json({ error: "Missing email or shopName" }, { status: 400 });
    }

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      // Silently skip if no key configured — don't block signup
      return NextResponse.json({ ok: true, skipped: true });
    }

    // T-16: HTML-escape all user-supplied values before embedding in HTML
    const esc = (s) => String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

    const safeShopName = esc(shopName);

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Welcome to BOSS</title>
</head>
<body style="margin:0;padding:0;background:#F5F5F7;font-family:'Plus Jakarta Sans',Arial,sans-serif">
  <div style="max-width:480px;margin:0 auto;padding:32px 20px">

    <!-- Logo -->
    <div style="text-align:center;margin-bottom:32px">
      <div style="display:inline-flex;width:64px;height:64px;background:#1C1C1E;border-radius:18px;align-items:center;justify-content:center;font-size:30px;font-weight:900;color:#fff">B</div>
      <div style="font-size:22px;font-weight:900;color:#1C1C1E;margin-top:12px;letter-spacing:-0.5px">BOSS</div>
      <div style="font-size:12px;color:#8E8E93;margin-top:4px;letter-spacing:1px;text-transform:uppercase">Build Trust. Grow Faster.</div>
    </div>

    <!-- Card -->
    <div style="background:#fff;border-radius:24px;padding:28px;box-shadow:0 2px 20px rgba(0,0,0,0.06)">
      <div style="font-size:22px;font-weight:900;color:#1C1C1E;margin-bottom:8px;letter-spacing:-0.5px">
        Welcome, ${safeShopName}! 🎉
      </div>
      <div style="font-size:15px;color:#8E8E93;line-height:1.6;margin-bottom:24px">
        Your BOSS profile is set up. It's time your business got the respect it deserves.
      </div>

      <!-- Checklist -->
      <div style="font-size:12px;font-weight:700;color:#8E8E93;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:14px">
        Get started in 3 steps
      </div>

      ${[
        ["👤", "Add your first client", "Their name and phone number is all you need."],
        ["📋", "Create your first order", "Record the cloth type, price, deposit, and delivery date."],
        ["💳", "Connect your bank account", "So customers can pay you directly online."],
      ].map(([icon, title, sub]) => `
        <div style="display:flex;gap:14px;padding:14px 0;border-bottom:1px solid #F5F5F7;align-items:flex-start">
          <div style="font-size:22px;flex-shrink:0">${icon}</div>
          <div>
            <div style="font-weight:700;color:#1C1C1E;font-size:14px">${title}</div>
            <div style="font-size:12px;color:#8E8E93;margin-top:3px">${sub}</div>
          </div>
        </div>
      `).join("")}

      <!-- CTA -->
      <div style="margin-top:24px">
        <a href="${process.env.NEXT_PUBLIC_APP_URL || "https://boss-app-nine.vercel.app"}"
          style="display:block;background:#1C1C1E;color:#fff;text-align:center;padding:16px;border-radius:14px;text-decoration:none;font-weight:700;font-size:16px;letter-spacing:-0.2px">
          Open BOSS Now →
        </a>
      </div>
    </div>

    <!-- Footer -->
    <div style="text-align:center;margin-top:24px;font-size:12px;color:#C7C7CC;line-height:1.6">
      BOSS by Monoversal Hub<br>
      Made for artisans in Lagos 🇳🇬
    </div>
  </div>
</body>
</html>`;

    const res = await fetch(RESEND_API, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from:    FROM_EMAIL,
        to:      [email],
        subject: `Welcome to BOSS, ${safeShopName}! Your business just got serious.`,
        html,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      console.error("Resend error:", data);
      return NextResponse.json({ ok: true, skipped: true }); // Don't block on email error
    }

    return NextResponse.json({ ok: true, id: data.id });
  } catch (err) {
    console.error("Welcome email error:", err);
    return NextResponse.json({ ok: true, skipped: true }); // Never block on email error
  }
}
