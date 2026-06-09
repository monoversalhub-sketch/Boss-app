import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { sendPushToTailor } from "@/lib/push";

export const maxDuration = 120;

export async function GET(request) {
  if (request.headers.get("Authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = getAdminClient();
    if (!supabase) return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });

    const tailorIds = await supabase
      .from("push_subscriptions")
      .select("tailor_id");

    if (!tailorIds.data?.length) {
      return NextResponse.json({ ok: true, sent: 0 });
    }

    const unique = [...new Set(tailorIds.data.map(r => r.tailor_id))];
    let sent = 0;

    for (const tailorId of unique) {
      try {
        const { data: tailor } = await supabase
          .from("tailors")
          .select("id, notif_briefing")
          .eq("id", tailorId)
          .single();
        if (!tailor?.notif_briefing) continue;

        const { count: dueThisWeek } = await supabase
          .from("orders")
          .select("id", { count: "exact", head: true })
          .eq("tailor_id", tailorId)
          .neq("status", "Delivered");

        const { count: outstanding } = await supabase
          .from("orders")
          .select("id", { count: "exact", head: true })
          .eq("tailor_id", tailorId)
          .neq("status", "Delivered")
          .gt("price", 0);

        sent++;
        await sendPushToTailor(
          supabase, tailorId,
          "📊 Weekly Summary",
          `${dueThisWeek || 0} active orders · ${outstanding || 0} with balance`,
          "/"
        );
      } catch (e) {
        console.error(`[cron/weekly-summary] tailor ${tailorId}:`, e);
      }
    }

    return NextResponse.json({ ok: true, sent });
  } catch (e) {
    console.error("[cron/weekly-summary]", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
