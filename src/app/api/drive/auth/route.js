import { createClient } from "@/lib/supabase/server";
import { getDriveAuthUrl } from "@/lib/drive";
import { NextResponse } from "next/server";

export async function GET(request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.redirect(new URL("/?auth_error=not_signed_in", request.url));
    }

    const authUrl = getDriveAuthUrl(user.id);
    return NextResponse.redirect(authUrl);
  } catch (err) {
    console.error("[drive/auth]", err);
    return NextResponse.json({ error: "Failed to initiate Drive auth" }, { status: 500 });
  }
}
