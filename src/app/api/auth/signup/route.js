// src/app/api/auth/signup/route.js — BOSS v11
// ROOT CAUSE FIX:
//   admin.createUser() with email_confirm: false creates the user but does NOT
//   send a confirmation email — it only sets email_confirmed to false.
//   To trigger the actual confirmation email, we must use signUp() on the
//   ANON client, which goes through Supabase Auth's email flow properly.
//
//   admin.createUser() is the right tool when you want to create a user
//   WITHOUT sending an email (e.g. seeding, admin panel).
//   signUp() on the anon client is the right tool when you WANT the email sent.
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { checkRateLimit, getClientIp } from "@/lib/ratelimit";

export async function POST(request) {
  const ip = getClientIp(request);
  const { success } = await checkRateLimit(ip);
  if (!success) {
    return NextResponse.json(
      { error: "Too many signup attempts. Please wait a minute and try again." },
      { status: 429 }
    );
  }

  try {
    const { email, password, shopName } = await request.json();
    if (!email || !password) {
      return NextResponse.json({ error: "Email and password required" }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
    }

    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "");

    // MUST use anon key + signUp() to trigger the confirmation email flow.
    // The service role key bypasses Auth email sending entirely.
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

    const { data, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        emailRedirectTo: appUrl || undefined,
      },
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // If identities is empty, email already exists in Supabase
    if (data.user && data.user.identities && data.user.identities.length === 0) {
      return NextResponse.json(
        { error: "An account with this email already exists. Please log in." },
        { status: 400 }
      );
    }

    // Send welcome email (non-blocking — after account created)
    if (shopName && appUrl) {
      fetch(`${appUrl}/api/welcome-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, shopName }),
      }).catch(() => {});
    }

    // session is null until email is confirmed — needsConfirmation = true
    return NextResponse.json({
      user: data.user ? { id: data.user.id, email: data.user.email } : null,
      session: data.session ? true : false,
      needsConfirmation: !data.session,
    });
  } catch (e) {
    console.error("[signup]", e);
    return NextResponse.json({ error: "Server error. Please try again." }, { status: 500 });
  }
}
