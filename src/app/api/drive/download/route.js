export const dynamic = 'force-dynamic';

import { createClient } from "@/lib/supabase/server";
import { downloadBackup } from "@/lib/drive";
import { NextResponse } from "next/server";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const fileId = searchParams.get("id");

  if (!fileId) {
    return NextResponse.json({ error: "Missing file id" }, { status: 400 });
  }

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
      return NextResponse.json({ error: "Google Drive not connected" }, { status: 400 });
    }

    const data = await downloadBackup(tailor.google_drive_refresh_token, fileId);
    return NextResponse.json({ ok: true, data });
  } catch (e) {
    console.error("[drive/download]", e);
    return NextResponse.json({ error: e.message || "Download failed" }, { status: 500 });
  }
}
