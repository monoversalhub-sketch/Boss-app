import { unstable_noStore as noStore } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { exchangeCodeForTokens } from "@/lib/drive";
import { NextResponse } from "next/server";

export async function GET(request) {
  noStore();
  const { searchParams } = new URL(request.url);
  const code  = searchParams.get("code");
  const state = searchParams.get("state");
  const err   = searchParams.get("error");

  if (err) {
    console.warn("[drive/callback] user denied:", err);
    return NextResponse.redirect(new URL("/?drive=denied", request.url));
  }

  if (!code || !state) {
    return NextResponse.redirect(new URL("/?drive=error", request.url));
  }

  try {
    const userId = Buffer.from(state, "base64").toString("utf8");
    const tokens = await exchangeCodeForTokens(code);

    if (!tokens.refresh_token) {
      console.error("[drive/callback] No refresh_token in response");
      return NextResponse.redirect(new URL("/?drive=no_token", request.url));
    }

    const supabase = await createClient();
    const { error: dbError } = await supabase
      .from("tailors")
      .update({ google_drive_refresh_token: tokens.refresh_token })
      .eq("user_id", userId);

    if (dbError) {
      console.error("[drive/callback] DB update failed:", dbError.message);
      return NextResponse.redirect(new URL("/?drive=db_error", request.url));
    }

    return NextResponse.redirect(new URL("/?drive=connected", request.url));
  } catch (e) {
    console.error("[drive/callback]", e);
    return NextResponse.redirect(new URL("/?drive=error", request.url));
  }
}
