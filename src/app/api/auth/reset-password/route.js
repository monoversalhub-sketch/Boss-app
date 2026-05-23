// src/app/api/auth/reset-password/route.js — BOSS v11
// FIX: Use admin.updateUserById() instead of updateUser().
// updateUser() requires an active user session on the client — the service
// role client has no session. admin.updateUserById() works server-side
// by userId without needing a session token.
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request) {
  try {
    const { password, userId } = await request.json();

    if (!password || password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters." },
        { status: 400 }
      );
    }

    if (!userId) {
      return NextResponse.json(
        { error: "Not authenticated. Please sign out and log in again." },
        { status: 401 }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // admin.updateUserById — updates any user by ID, no session required
    const { error } = await supabase.auth.admin.updateUserById(userId, { password });

    if (error) {
      console.error("[reset-password]", error.message);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[reset-password] Route error:", err);
    return NextResponse.json({ error: "Failed to update password. Try again." }, { status: 500 });
  }
}
