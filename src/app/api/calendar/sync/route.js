import { unstable_noStore as noStore } from "next/cache";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  createDeliveryEvent,
  updateDeliveryEvent,
  deleteDeliveryEvent,
} from "@/lib/calendar";

export async function POST(request) {
  noStore();
  try {
    const supabase = await createClient();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const { orderId, customerId, action } = await request.json();
    if (!orderId || !action) {
      return NextResponse.json({ ok: false, error: "Missing orderId or action" }, { status: 400 });
    }

    const { data: tailor, error: tailorErr } = await supabase
      .from("tailors")
      .select("google_drive_refresh_token")
      .eq("user_id", user.id)
      .single();

    if (tailorErr || !tailor?.google_drive_refresh_token) {
      return NextResponse.json({ ok: false, error: "No Google connected" }, { status: 200 });
    }

    const refreshToken = tailor.google_drive_refresh_token;

    if (action === "delete") {
      const { data: order } = await supabase
        .from("orders")
        .select("google_event_id")
        .eq("id", orderId)
        .single();

      if (order?.google_event_id) {
        await deleteDeliveryEvent(refreshToken, order.google_event_id);
        await supabase.from("orders").update({ google_event_id: null }).eq("id", orderId);
      }
      return NextResponse.json({ ok: true });
    }

    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .single();

    if (orderErr || !order) {
      return NextResponse.json({ ok: false, error: "Order not found" }, { status: 404 });
    }

    let customer;
    if (customerId) {
      const { data: c } = await supabase.from("customers").select("*").eq("id", customerId).single();
      customer = c;
    }

    if (!customer) {
      const { data: c } = await supabase
        .from("customers")
        .select("*")
        .eq("id", order.customer_id)
        .single();
      customer = c;
    }

    if (!customer) {
      return NextResponse.json({ ok: false, error: "Customer not found" }, { status: 404 });
    }

    let eventId;

    if (action === "create") {
      eventId = await createDeliveryEvent(refreshToken, order, customer, tailor.shop);
      await supabase.from("orders").update({ google_event_id: eventId }).eq("id", orderId);
    } else if (action === "update") {
      if (order.google_event_id) {
        await updateDeliveryEvent(refreshToken, order.google_event_id, order, customer);
      } else {
        eventId = await createDeliveryEvent(refreshToken, order, customer, tailor.shop);
        await supabase.from("orders").update({ google_event_id: eventId }).eq("id", orderId);
      }
    }

    return NextResponse.json({ ok: true, eventId });
  } catch (e) {
    console.error("[calendar/sync]", e);
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
