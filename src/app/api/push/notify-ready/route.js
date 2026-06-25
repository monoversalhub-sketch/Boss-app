import { unstable_noStore as noStore } from "next/cache";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendPushToTailor } from "@/lib/push";

export async function POST(request) {
  noStore();
  try {
    const supabase = await createClient();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: tailor } = await supabase
      .from("tailors")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (!tailor) {
      return NextResponse.json({ error: "Tailor not found" }, { status: 404 });
    }

    const { orderId, customerName, orderType, status } = await request.json();

    const title = status === "Delivered"
      ? `✅ ${customerName || "Order"} delivered`
      : `📦 ${customerName || "Order"} is ${status || "ready"}`;

    const body = status === "Delivered"
      ? `${orderType || "Order"} — mark as complete?`
      : `${orderType || "Order"} — ready for pickup`;

    await sendPushToTailor(supabase, tailor.id, title, body, "/");

    return NextResponse.json({ ok: true, sent: true });
  } catch (e) {
    console.error("[push/notify-ready]", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
