// src/app/api/paystack-webhook/route.js
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key || url === "undefined") return null;
  return createClient(url, key);
}

export async function POST(request) {
  const body      = await request.text();
  const signature = request.headers.get("x-paystack-signature");
  const secretKey = process.env.PAYSTACK_SECRET_KEY;

  if (!signature || !secretKey) return new Response("Missing signature", { status: 400 });

  const hash = crypto.createHmac("sha512", secretKey).update(body).digest("hex");
  if (hash !== signature) {
    console.warn("[webhook] Invalid signature");
    return new Response("Unauthorized", { status: 401 });
  }

  let event;
  try { event = JSON.parse(body); }
  catch { return new Response("Invalid JSON", { status: 400 }); }

  const supabase = getSupabase();
  if (!supabase) {
    console.warn("[webhook] Supabase not configured");
    return new Response("OK", { status: 200 });
  }

  console.log("[webhook] Event:", event.event);

  if (event.event === "charge.success") {
    await handleChargeSuccess(supabase, event.data);
  } else if (
    event.event === "transfer.success" ||
    event.event === "dedicatedaccount.transfer.success"
  ) {
    await handleVirtualAccountTransfer(supabase, event.data);
  }

  return new Response("OK", { status: 200 });
}

async function handleChargeSuccess(supabase, data) {
  const ref       = data.reference;
  const amountNGN = data.amount / 100;
  const parts     = (ref || "").split("_");
  const orderId   = parts[1];

  if (!orderId) { console.warn("[webhook] No orderId in ref:", ref); return; }

  const { data: order } = await supabase
    .from("orders").select("id, paid, tailor_id").eq("id", orderId).single();
  if (!order) { console.warn("[webhook] Order not found:", orderId); return; }

  await supabase.from("orders")
    .update({ paid: (parseFloat(order.paid)||0) + amountNGN, paystack_ref: ref })
    .eq("id", orderId);

  await supabase.from("payments").insert({
    order_id: orderId, tailor_id: order.tailor_id,
    amount: amountNGN, method: "paystack", paystack_ref: ref,
  });

  await updateBosScore(supabase, order.tailor_id);
  console.log(`[webhook] charge.success ₦${amountNGN} → order ${orderId}`);
}

async function handleVirtualAccountTransfer(supabase, data) {
  const amountNGN            = (data.amount || 0) / 100;
  const virtualAccountNumber = data.dedicated_account?.account_number ||
                                data.recipient?.account_number || null;
  const transferCode         = data.transfer_code || null;
  const senderName           = data.customer?.name || null;

  const { data: tailor } = await supabase
    .from("tailors").select("id, shop")
    .eq("virtual_account_number", virtualAccountNumber).single();

  if (!tailor) {
    console.warn("[webhook] No tailor for virtual account:", virtualAccountNumber);
    return;
  }

  const { data: payment } = await supabase.from("payments").insert({
    tailor_id: tailor.id, amount: amountNGN, method: "virtual_account",
    virtual_account_number: virtualAccountNumber,
    transfer_code: transferCode, sender_name: senderName, order_id: null,
  }).select().single();

  // Auto-match to outstanding order by amount
  const { data: orders } = await supabase
    .from("orders").select("id, price, deposit, paid")
    .eq("tailor_id", tailor.id).neq("status", "Delivered")
    .order("created_at", { ascending: true });

  const match = orders?.find(o => {
    const bal = (parseFloat(o.price)||0) - (parseFloat(o.deposit)||0) - (parseFloat(o.paid)||0);
    return Math.abs(bal - amountNGN) < 1;
  });

  if (match) {
    await supabase.from("orders")
      .update({ paid: (parseFloat(match.paid)||0) + amountNGN })
      .eq("id", match.id);
    if (payment?.id) {
      await supabase.from("payments").update({ order_id: match.id }).eq("id", payment.id);
    }
    console.log(`[webhook] ✅ Auto-matched ₦${amountNGN} → order ${match.id}`);
  } else {
    console.log(`[webhook] ⚠️ ₦${amountNGN} unmatched for ${tailor.shop}`);
  }

  await updateBosScore(supabase, tailor.id);
}

async function updateBosScore(supabase, tailorId) {
  try {
    const { data: orders } = await supabase
      .from("orders")
      .select("id, price, deposit, paid, status, delivery_date, customer_id")
      .eq("tailor_id", tailorId);

    if (!orders?.length) {
      await supabase.from("tailors")
        .update({ bos_score: 0, bos_score_updated_at: new Date().toISOString() })
        .eq("id", tailorId);
      return;
    }

    const total          = orders.length;
    const delivered      = orders.filter(o => o.status === "Delivered").length;
    const completionRate = total > 0 ? delivered / total : 0;

    const customerIds = orders.map(o => o.customer_id);
    const uniqueIds   = new Set(customerIds);
    const repeatCount = customerIds.length - uniqueIds.size;
    const repeatRate  = uniqueIds.size > 0 ? Math.min(1, repeatCount / uniqueIds.size) : 0;

    const fullyPaid   = orders.filter(o =>
      o.status === "Delivered" &&
      ((parseFloat(o.price)||0) - (parseFloat(o.deposit)||0) - (parseFloat(o.paid)||0)) <= 0
    ).length;
    const paymentRate = delivered > 0 ? fullyPaid / delivered : 0;

    const revenue      = orders.reduce((s,o) => s + (parseFloat(o.deposit)||0) + (parseFloat(o.paid)||0), 0);
    const revenueScore = Math.min(1, revenue / (total * 50000));

    const now     = new Date();
    const overdue = orders.filter(o =>
      o.status !== "Delivered" && o.delivery_date && new Date(o.delivery_date) < now
    ).length;
    const penalty = Math.min(0.3, overdue * 0.05);

    const raw   = (completionRate*30)+(repeatRate*25)+(paymentRate*25)+(revenueScore*20)-(penalty*100);
    const score = Math.max(0, Math.min(100, Math.round(raw)));

    await supabase.from("tailors")
      .update({ bos_score: score, bos_score_updated_at: new Date().toISOString() })
      .eq("id", tailorId);

    console.log(`[webhook] BOS score: ${score} for ${tailorId}`);
  } catch (err) {
    console.error("[webhook] BOS score error:", err);
  }
}
