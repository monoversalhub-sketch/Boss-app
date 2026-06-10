import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase/admin";

export async function POST(request) {
  try {
    const { email } = await request.json();
    if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });

    const admin = getAdminClient();
    const { data } = await admin
      .from("admin_users")
      .select("id, email, name, role")
      .ilike("email", email.trim())
      .maybeSingle();

    if (!data) return NextResponse.json({ error: "Not an admin user" }, { status: 404 });

    return NextResponse.json({ admin: data });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
