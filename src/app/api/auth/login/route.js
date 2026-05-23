// src/app/api/auth/login/route.js
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { checkRateLimit, getClientIp } from "@/lib/ratelimit";

export async function POST(request) {
  // S-02: Distributed rate limiting via Upstash Redis (10 req/min/IP across all instances)
  const ip = getClientIp(request);
  const { success } = await checkRateLimit(ip);
  if (!success) {
    return NextResponse.json(
      { error: "Too many login attempts. Please wait a minute and try again." },
      { status: 429 }
    );
  }

  try {
    const { email, password } = await request.json();
    if (!email || !password) {
      return NextResponse.json({ error: "Email and password required" }, { status: 400 });
    }
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({
      user: { id: data.user.id, email: data.user.email },
      session: true,
    });
  } catch (e) {
    return NextResponse.json({ error: "Server error. Please try again." }, { status: 500 });
  }
}
