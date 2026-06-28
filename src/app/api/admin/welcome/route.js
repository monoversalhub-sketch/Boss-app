import { NextResponse } from "next/server";
import { unstable_noStore } from "next/cache";
import { getAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  unstable_noStore();
  try {
    const client = getAdminClient();
    const { data, error } = await client
      .from("tailors")
      .select("id, shop, phone, created_at, welcome_sent_at, user_id")
      .is("welcome_sent_at", null)
      .not("phone", "is", null)
      .not("phone", "eq", "")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) throw error;
    return NextResponse.json({ tailors: data || [] });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  unstable_noStore();
  try {
    const { tailor_id } = await request.json();
    if (!tailor_id) {
      return NextResponse.json({ error: "Missing tailor_id" }, { status: 400 });
    }
    const client = getAdminClient();
    const { error } = await client
      .from("tailors")
      .update({ welcome_sent_at: new Date().toISOString() })
      .eq("id", tailor_id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
