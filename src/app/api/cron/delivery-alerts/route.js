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

    const today = new Date().toISOString().slice(0, 10);
    const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
    const in3Days = new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10);

    const { data: orders } = await supabase
      .from("orders")
      .select("id, delivery_date, type, price, deposit, paid, tailor_id, customer_id, customers(name)")
      .in("delivery_date", [today, tomorrow, in3Days])
      .neq("status", "Delivered");

    if (!orders?.length) {
      return NextResponse.json({ ok: true, sent: 0 });
    }

    const byTailor = {};
    for (const o of orders) {
      if (!byTailor[o.tailor_id]) byTailor[o.tailor_id] = [];
      byTailor[o.tailor_id].push(o);
    }

    const supabase2 = await createClient();
    let sent = 0;

    for (const [tailorId, tailorOrders] of Object.entries(byTailor)) {
      try {
        const { data: tailor } = await supabase2
          .from("tailors")
          .select("id, notif_delivery")
          .eq("id", tailorId)
          .single();

        if (!tailor?.notif_delivery) continue;

        for (const o of tailorOrders) {
          const name = o.customers?.name || "a customer";
          const bal = Math.max(0, (o.price || 0) - (o.deposit || 0) - (o.paid || 0));
          const dayLabel =
            o.delivery_date === today ? "today" :
            o.delivery_date === tomorrow ? "tomorrow" : "in 3 days";

          sent++;
          await sendPushToTailor(
            supabase2,
            tailorId,
            `📅 ${name} — due ${dayLabel}`,
            `${o.type || "Order"} — ₦${bal.toLocaleString("en-NG")} outstanding`,
            "/"
          );
        }
      } catch (e) {
        console.error(`[cron/delivery-alerts] tailor ${tailorId}:`, e);
      }
    }

    return NextResponse.json({ ok: true, sent });
  } catch (e) {
    console.error("[cron/delivery-alerts]", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
