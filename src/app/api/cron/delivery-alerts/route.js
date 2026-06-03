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

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const in3Days = new Date(today);
    in3Days.setDate(in3Days.getDate() + 3);

    const todayEnd = new Date(today);
    todayEnd.setHours(23, 59, 59, 999);
    const tomorrowEnd = new Date(tomorrow);
    tomorrowEnd.setHours(23, 59, 59, 999);
    const in3DaysEnd = new Date(in3Days);
    in3DaysEnd.setHours(23, 59, 59, 999);

    const { data: orders } = await supabase
      .from("orders")
      .select("id, delivery_date, type, price, deposit, paid, tailor_id, customer_id, customers(name)")
      .or(
        `and(delivery_date.gte.${today.toISOString()},delivery_date.lte.${todayEnd.toISOString()}),` +
        `and(delivery_date.gte.${tomorrow.toISOString()},delivery_date.lte.${tomorrowEnd.toISOString()}),` +
        `and(delivery_date.gte.${in3Days.toISOString()},delivery_date.lte.${in3DaysEnd.toISOString()})`
      )
      .neq("status", "Delivered");

    if (!orders?.length) {
      return NextResponse.json({ ok: true, sent: 0 });
    }

    const byTailor = {};
    for (const o of orders) {
      if (!byTailor[o.tailor_id]) byTailor[o.tailor_id] = [];
      byTailor[o.tailor_id].push(o);
    }

    let sent = 0;

    for (const [tailorId, tailorOrders] of Object.entries(byTailor)) {
      try {
        const { data: tailor } = await supabase
          .from("tailors")
          .select("id, notif_delivery")
          .eq("id", tailorId)
          .single();

        if (!tailor?.notif_delivery) continue;

        for (const o of tailorOrders) {
          const name = o.customers?.name || "a customer";
          const bal = Math.max(0, (o.price || 0) - (o.deposit || 0) - (o.paid || 0));
          const od = o.delivery_date ? new Date(o.delivery_date).toISOString().slice(0, 10) : "";
          const td = today.toISOString().slice(0, 10);
          const tm = tomorrow.toISOString().slice(0, 10);
          const i3 = in3Days.toISOString().slice(0, 10);
          const dayLabel =
            od === td ? "today" :
            od === tm ? "tomorrow" : "in 3 days";

          sent++;
          await sendPushToTailor(
            supabase,
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
