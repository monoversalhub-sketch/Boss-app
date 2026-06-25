// src/app/auth/callback/route.js
// Google OAuth / Magic link callback — exchanges code for session, redirects appropriately
import { createClient } from "@/lib/supabase/server";
import { getAdminClient } from "@/lib/supabase/admin";
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
      const admin = getAdminClient();
      if (admin) {
        const { data: adminUser } = await admin
          .from("admin_users")
          .select("id")
          .ilike("email", user.email)
          .maybeSingle();
        if (adminUser) {
          return NextResponse.redirect(new URL("/admin", request.url));
        }
      }
    }

    const response = NextResponse.redirect(new URL("/app", request.url));
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch (err) {
    console.error("[auth/callback] Unexpected error:", err);
    return NextResponse.redirect(new URL("/app?auth_error=callback_failed", request.url));
  }
}
