import { unstable_noStore as noStore } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { listBackups } from "@/lib/drive";
import { NextResponse } from "next/server";

export async function GET(request) {
  noStore();
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: tailor } = await supabase
      .from("tailors")
      .select("google_drive_refresh_token")
      .eq("user_id", user.id)
      .single();

    if (!tailor?.google_drive_refresh_token) {
      return NextResponse.json({ files: [], connected: false });
    }

    const files = await listBackups(tailor.google_drive_refresh_token);
    return NextResponse.json({ files, connected: true });
  } catch (e) {
    console.error("[drive/list]", e);
    return NextResponse.json({ error: e.message || "List failed" }, { status: 500 });
  }
}
