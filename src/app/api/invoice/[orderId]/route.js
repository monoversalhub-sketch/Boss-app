// src/app/api/invoice/[orderId]/route.js
// ─────────────────────────────────────────────────────────────────
//  Public invoice API — no auth required.
//  Used by the invoice page (/invoice/[orderId]) to fetch order data.
//
//  Returns the order, customer, and tailor details including the
//  tailor's VIRTUAL ACCOUNT (for bank transfer payment instructions).
//  No subaccount_code — that model is removed.
// ─────────────────────────────────────────────────────────────────

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
  if (!supabase) {
    return Response.json({ error: "SUPABASE_NOT_CONFIGURED" }, { status: 503 });
  }

  const { data: order, error } = await supabase
    .from("orders")
    .select(`
      id, type, price, deposit, paid,
      delivery_date, status, notes, paystack_ref, created_at,
      customers ( id, name, phone ),
      tailors   (
        id, shop, phone, city,
        virtual_account_number,
        virtual_bank_name,
        virtual_account_name,
        virtual_account_status
      )
    `)
    .eq("id", orderId)
    .single();

  if (error || !order) {
    return Response.json(
      { error: "Invoice not found. The link may be invalid or expired." },
      { status: 404 }
    );
  }

  const t = order.tailors || {};

  return Response.json({
    order: {
      id:            order.id,
      type:          order.type          || "Order",
      price:         parseFloat(order.price)   || 0,
      deposit:       parseFloat(order.deposit) || 0,
      paid:          parseFloat(order.paid)    || 0,
      delivery_date: order.delivery_date       || null,
      status:        order.status              || "In Progress",
      notes:         order.notes               || "",
    },
    customer: {
      name:  order.customers?.name  || "Customer",
      phone: order.customers?.phone || "",
    },
    tailor: {
      shop:                   t.shop                   || "BOSS Shop",
      city:                   t.city                   || "",
      phone:                  t.phone                  || "",
      // Virtual account — what the customer uses to pay via bank transfer
      virtual_account_number: t.virtual_account_number || null,
      virtual_bank_name:      t.virtual_bank_name      || null,
      virtual_account_name:   t.virtual_account_name   || null,
      virtual_account_status: t.virtual_account_status || "inactive",
    },
  });
}

// POST — accepts embedded invoice data from the app
// Used when the order isn't in the DB yet (local-only mode)
export async function POST(request) {
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
