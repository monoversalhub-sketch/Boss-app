// src/app/api/auth/logout/route.js — BOSS v11
// MISSING-10: CSRF protection — require x-boss-request header.
// Browsers never attach custom headers to cross-site form/fetch requests
// by default, so this prevents a third-party page force-logging users out.
import { unstable_noStore as noStore } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request) {
  noStore();
  // CSRF guard: x-boss-request must be "1" — browsers never send this cross-site
  const appHeader = request.headers.get("x-boss-request");
  if (appHeader !== "1") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const supabase = await createClient();
    await supabase.auth.signOut();
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
