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

    const { data: orders } = await supabase
      .from("orders")
      .select("id, price, deposit, paid, type, tailor_id, customer_id, customers(name)")
      .eq("status", "Delivered");

    const withBalance = (orders || []).filter(o => {
      const bal = (o.price || 0) - (o.deposit || 0) - (o.paid || 0);
      return bal > 0;
    });

    if (!withBalance.length) {
      return NextResponse.json({ ok: true, sent: 0 });
    }

    const byTailor = {};
    for (const o of withBalance) {
      if (!byTailor[o.tailor_id]) byTailor[o.tailor_id] = [];
      byTailor[o.tailor_id].push(o);
    }

    let sent = 0;

    for (const [tailorId, tailorOrders] of Object.entries(byTailor)) {
      try {
        const { data: tailor } = await supabase
          .from("tailors")
          .select("id, notif_payments")
          .eq("id", tailorId)
          .single();

        if (!tailor?.notif_payments) continue;

        const totalOwed = tailorOrders.reduce(
          (s, o) => s + Math.max(0, (o.price || 0) - (o.deposit || 0) - (o.paid || 0)), 0
        );

        const names = tailorOrders.slice(0, 3).map(o => o.customers?.name || "a customer").join(", ");
        const more = tailorOrders.length > 3 ? ` +${tailorOrders.length - 3} more` : "";

        sent++;
        await sendPushToTailor(
          supabase,
          tailorId,
          `💰 Unpaid balances — ₦${totalOwed.toLocaleString("en-NG")}`,
          `${names}${more}. Tap to send reminders.`,
          "/"
        );
      } catch (e) {
        console.error(`[cron/payment-nudges] tailor ${tailorId}:`, e);
      }
    }

    return NextResponse.json({ ok: true, sent });
  } catch (e) {
    console.error("[cron/payment-nudges]", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
