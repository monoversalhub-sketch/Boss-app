// src/app/api/invoice/[orderId]/route.js — BOSS v11
// GET: Public, no auth (UUID is the secret). Phone fields omitted (L-03/S-05).
// POST: PARTIAL-04 fix — requires x-boss-invoice-token header to prevent
//       unauthenticated fake invoice generation from the real BOSS domain.
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
      delivery_date, status, notes, created_at,
      customers ( id, name ),
      tailors (
        id, shop, city, phone,
        bank_name, account_number, account_name,
        crypto_address
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
      delivery_date: order.delivery_date || null,
      status:        order.status        || "In Progress",
      notes:         order.notes         || "",
      created_at:    order.created_at,
    },
    customer: {
      id:   order.customers?.id   || "",
      name: order.customers?.name || "Customer",
      // phone intentionally omitted — L-03 / S-05
    },
    tailor: {
      id:               t.id               || "",
      shop:             t.shop             || "",
      city:             t.city             || "",
      phone:            t.phone            || "",
      bank_name:        t.bank_name        || "",
      account_number:   t.account_number   || "",
      account_name:     t.account_name     || "",
      crypto_address:   t.crypto_address   || null,
    },
  });
}

// POST — PARTIAL-04: Require secret token to prevent phishing
export async function POST(request) {
  const appSecret = request.headers.get("x-boss-invoice-token");
  const expected  = process.env.BOSS_INVOICE_TOKEN;

  if (!expected || appSecret !== expected) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { order, customer, tailor } = await request.json();
    if (!order || !customer || !tailor) {
      return Response.json({ error: "Missing required fields" }, { status: 400 });
    }
    // Strip phone defensively
    const safeCustomer = { id: customer.id, name: customer.name };
    const safeTailor   = {
      id: tailor.id, shop: tailor.shop, city: tailor.city,
    };
    return Response.json({ order, customer: safeCustomer, tailor: safeTailor });
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }
}
