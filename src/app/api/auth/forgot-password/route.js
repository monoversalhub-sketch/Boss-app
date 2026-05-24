// src/app/api/auth/forgot-password/route.js — BOSS v11
// ROOT CAUSE FIX:
//   resetPasswordForEmail() is a CLIENT-SIDE auth method. It CANNOT be called
//   with the service role key — the service role client has no concept of a
//   "current user session" and Supabase silently ignores the email send.
//   Must use the ANON key (public key) for this specific call.
//   The anon key is safe here because resetPasswordForEmail does not expose
//   any privileged data — it only triggers an email to the supplied address.
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request) {
  try {
    const { email } = await request.json();
    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "");

    // MUST use anon key — service role key silently suppresses the email send
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: appUrl || undefined,
    });

    if (error) {
      console.error("[forgot-password] Supabase error:", error.message);
    }

    // Always return ok — never reveal whether the email exists
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[forgot-password] Route error:", err);
    return NextResponse.json({ ok: true });
  }
}
