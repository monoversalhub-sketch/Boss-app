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

    const { data: tailors } = await supabase
      .from("tailors")
      .select("id, shop")
      .eq("notif_briefing", true);

    if (!tailors?.length) {
      return NextResponse.json({ ok: true, sent: 0 });
    }

    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const weekEnd = new Date(now);
    weekEnd.setDate(weekEnd.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    let sent = 0;

    for (const tailor of tailors) {
      try {
        const { data: orders } = await supabase
          .from("orders")
          .select("delivery_date, price, deposit, paid")
          .eq("tailor_id", tailor.id)
          .neq("status", "Delivered");

        const dueThisWeek = (orders || []).filter(o => {
          if (!o.delivery_date) return false;
          const d = new Date(o.delivery_date);
          return d >= now && d <= weekEnd;
        });

        const outstanding = (orders || []).reduce(
          (sum, o) => sum + Math.max(0, (o.price || 0) - (o.deposit || 0) - (o.paid || 0)),
          0
        );

        if (dueThisWeek.length === 0 && outstanding === 0) continue;

        sent++;
        await sendPushToTailor(
          supabase,
          tailor.id,
          `☀️ Good morning, ${tailor.shop || "BOSS"}`,
          `${dueThisWeek.length} job${dueThisWeek.length !== 1 ? "s" : ""} due this week, ₦${outstanding.toLocaleString("en-NG")} outstanding`,
          "/"
        );
      } catch (e) {
        console.error(`[cron/daily-briefing] tailor ${tailor.id}:`, e);
      }
    }

    return NextResponse.json({ ok: true, sent });
  } catch (e) {
    console.error("[cron/daily-briefing]", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
