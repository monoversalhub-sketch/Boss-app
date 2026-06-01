import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendPushToTailor } from "@/lib/push";

export const maxDuration = 120;

export async function GET(request) {
  if (request.headers.get("Authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = await createClient();

    const twoDaysAgo = new Date(Date.now() - 2 * 86400000).toISOString();

    const { data: tailors } = await supabase
      .from("tailors")
      .select("id, shop")
      .or(`last_seen_at.lt.${twoDaysAgo},last_seen_at.is.null`);

    if (!tailors?.length) {
      return NextResponse.json({ ok: true, sent: 0 });
    }

    let sent = 0;

    for (const tailor of tailors) {
      try {
        sent++;
        await sendPushToTailor(
          supabase,
          tailor.id,
          `👋 Hey ${tailor.shop || "BOSS"}, we miss you!`,
          "Your customers and orders are waiting. Come back and pick up where you left off.",
          "/"
        );
      } catch (e) {
        console.error(`[cron/re-engagement] tailor ${tailor.id}:`, e);
      }
    }

    return NextResponse.json({ ok: true, sent });
  } catch (e) {
    console.error("[cron/re-engagement]", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
