// src/app/auth/callback/route.js
// Google OAuth / Magic link callback — exchanges code for session, redirects appropriately
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(new URL("/?auth_error=callback_failed", request.url));
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error("[auth/callback] exchangeCodeForSession error:", error.message);
      return NextResponse.redirect(new URL("/?auth_error=callback_failed", request.url));
    }

    const { data: { user } } = await supabase.auth.getUser();

    if (user?.email) {
      const { data: adminUser } = await supabase
        .from("admin_users")
        .select("id")
        .eq("email", user.email)
        .maybeSingle();

      if (adminUser) {
        return NextResponse.redirect(new URL("/admin", request.url));
      }
    }

    return NextResponse.redirect(new URL("/", request.url));
  } catch (err) {
    console.error("[auth/callback] Unexpected error:", err);
    return NextResponse.redirect(new URL("/?auth_error=callback_failed", request.url));
  }
}
