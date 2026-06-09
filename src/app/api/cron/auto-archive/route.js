import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase/admin";

export const maxDuration = 120;

export async function GET(request) {
  if (request.headers.get("Authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = getAdminClient();
    if (!supabase) return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });

    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - 3);

    const { data: orders, error } = await supabase
      .from("orders")
      .select("id, status, delivery_date")
      .eq("status", "Delivered")
      .lte("delivery_date", cutoff.toISOString());

    if (error) throw error;

    if (!orders?.length) {
      return NextResponse.json({ ok: true, archived: 0 });
    }

    const ids = orders.map(o => o.id);
    const { error: delErr } = await supabase
      .from("orders")
      .update({ status: "Archived" })
      .in("id", ids);

    if (delErr) throw delErr;

    return NextResponse.json({ ok: true, archived: ids.length });
  } catch (e) {
    console.error("[cron/auto-archive]", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
