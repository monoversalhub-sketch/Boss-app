import { createClient } from "@/lib/supabase/server";
import { uploadBackup } from "@/lib/drive";
import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: tailor, error: tailorError } = await supabase
      .from("tailors")
      .select("id, google_drive_refresh_token")
      .eq("user_id", user.id)
      .single();

    if (tailorError || !tailor?.google_drive_refresh_token) {
      return NextResponse.json(
        { error: "Google Drive not connected. Connect Drive first." },
        { status: 400 }
      );
    }

    const backupData = await request.json();
    const file = await uploadBackup(tailor.google_drive_refresh_token, backupData);

    return NextResponse.json({ ok: true, file });
  } catch (e) {
    console.error("[drive/upload]", e);
    return NextResponse.json({ error: e.message || "Upload failed" }, { status: 500 });
  }
}
