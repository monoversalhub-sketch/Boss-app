// src/app/api/auth/session/route.js
// Returns current user session — called on app load
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return NextResponse.json({ user: null });
    return NextResponse.json({ user: { id: user.id, email: user.email } });
  } catch (e) {
    return NextResponse.json({ user: null });
  }
}
