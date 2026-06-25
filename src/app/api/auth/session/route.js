import { unstable_noStore as noStore } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  noStore();
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return NextResponse.json({ user: null });
    return NextResponse.json({ user: { id: user.id, email: user.email, user_metadata: user.user_metadata } });
  } catch (e) {
    return NextResponse.json({ user: null });
  }
}
