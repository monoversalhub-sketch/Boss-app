// src/app/api/invoice/[orderId]/route.js
import { createClient } from "@supabase/supabase-js";

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key || url.includes("placeholder") || url === "undefined") return null;
  return createClient(url, key);
}

export async function GET(request, { params }) {
  const { orderId } = await params;
  if (!orderId) {
    return Response.json({ error: "orderId is required" }, { status: 400 });
  }

  const supabase = getServiceClient();

  if (supabase) {
    // Step 1: get order + customer
    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .select(`
        id, type, price, deposit, paid,
        delivery_date, status, notes, paystack_ref, created_at,
        tailor_id,
        customers ( id, name, phone )
      `)
      .eq("id", orderId)
      .single();

    if (orderErr || !order) {
      return Response.json(
        { error: "Invoice not found. The link may be expired or incorrect." },
        { status: 404 }
      );
    }

    // Step 2: get tailor separately (avoids column name mismatch)
    const { data: tailor } = await supabase
      .from("tailors")
      .select("id, shop, phone, city, paystack_customer_code, virtual_account_number, virtual_bank_name, virtual_account_name")
      .eq("id", order.tailor_id)
      .single();

    return Response.json({
      order: {
        id:            order.id,
        type:          order.type          || "Order",
        price:         parseFloat(order.price)   || 0,
        deposit:       parseFloat(order.deposit) || 0,
        paid:          parseFloat(order.paid)    || 0,
        delivery_date: order.delivery_date || null,
        status:        order.status        || "In Progress",
        notes:         order.notes         || "",
      },
      customer: {
        name:  order.customers?.name  || "Customer",
        phone: order.customers?.phone || "",
      },
      tailor: {
        shop:                   tailor?.shop             || "BOSS Shop",
        city:                   tailor?.city             || "",
        phone:                  tailor?.phone            || "",
        virtual_account_number: tailor?.virtual_account_number || null,
        virtual_bank_name:      tailor?.virtual_bank_name      || null,
        virtual_account_name:   tailor?.virtual_account_name   || null,
      },
    });
  }

  return Response.json(
    { error: "SUPABASE_NOT_CONFIGURED" },
    { status: 503 }
  );
}

// POST — accepts embedded invoice data from the app (for when orders aren't in DB yet)
export async function POST(request, { params }) {
  try {
    const body = await request.json();
    const { order, customer, tailor } = body;
    if (!order || !customer || !tailor) {
      return Response.json({ error: "Missing data" }, { status: 400 });
    }
    return Response.json({ order, customer, tailor });
  } catch {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }
}

