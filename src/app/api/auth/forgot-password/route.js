// src/app/api/auth/forgot-password/route.js
// Sends a password reset email via Supabase Auth
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(request) {
  try {
    const { email } = await request.json();
    if (!email) return NextResponse.json({ error: "Email is required" }, { status: 400 });

    const redirectTo = `${process.env.NEXT_PUBLIC_APP_URL || "https://boss-app-nine.vercel.app"}/reset-password`;

    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });

    if (error) {
      console.error("Forgot password error:", error);
      // Return ok anyway — don't expose whether email exists
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Forgot password route error:", err);
    return NextResponse.json({ ok: true }); // Never expose errors
  }
}
