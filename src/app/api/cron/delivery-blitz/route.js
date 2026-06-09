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
    const tomorrowEnd = new Date(tomorrow);
    tomorrowEnd.setHours(23, 59, 59, 999);

    const { data: orders } = await supabase
      .from("orders")
      .select("id, delivery_date, type, price, deposit, paid, tailor_id, customer_id, customers(name)")
      .gte("delivery_date", tomorrow.toISOString())
      .lte("delivery_date", tomorrowEnd.toISOString())
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
        sent++;
        await sendPushToTailor(
          supabase, tailorId,
          `📦 ${tailorOrders.length} order${tailorOrders.length > 1 ? "s" : ""} due tomorrow`,
          tailorOrders.map(o => `${o.customers?.name || "a customer"} — ${o.type || "Order"}`).join(", "),
          "/"
        );
      } catch (e) {
        console.error(`[cron/delivery-blitz] tailor ${tailorId}:`, e);
      }
    }

    return NextResponse.json({ ok: true, sent });
  } catch (e) {
    console.error("[cron/delivery-blitz]", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
