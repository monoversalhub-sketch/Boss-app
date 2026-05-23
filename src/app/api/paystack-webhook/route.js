// src/app/api/paystack-webhook/route.js
// ─────────────────────────────────────────────────────────────────
//  Paystack Webhook Handler — BOSS v5
//
//  ARCHITECTURE (per BOSS master doc):
//  ─────────────────────────────────────────────────────────────────
//  When a customer transfers money to a tailor's virtual account:
//    1. Paystack fires: dedicatedaccount.transfer.success
//    2. We find the tailor by virtual_account_number
//    3. We record the payment in the payments table
//    4. We credit the tailor's wallet_balance on the tailors row
//    5. We attempt to auto-match to an outstanding order
//    6. We recompute the BOSS Trust Score
//
//  Money STAYS in the BOSS/Paystack ecosystem.
//  The tailor withdraws manually at their convenience (Phase 2).
//  We do NOT auto-route to any bank account.
//
//  charge.success fires when a customer pays via the invoice
//  Paystack popup (card payment). Same wallet credit logic applies.
//
//  transfer.success fires for OUTBOUND transfers (when BOSS sends
//  money OUT). We do NOT credit the wallet on this event — it would
//  double-count. We log it only.
//
//  Webhook URL to set in Paystack dashboard:
//  Settings → API Keys & Webhooks → Webhook URL:
//  https://your-app.vercel.app/api/paystack-webhook
// ─────────────────────────────────────────────────────────────────

import { createClient } from "@supabase/supabase-js";
import crypto           from "crypto";

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase service role not configured");
  return createClient(url, key);
}

export async function POST(request) {
  // ── 1. Verify Paystack signature ─────────────────────────────────
  const body      = await request.text();
  const signature = request.headers.get("x-paystack-signature");

  if (!signature) {
    console.warn("[webhook] Missing x-paystack-signature header");
    return new Response("Missing signature", { status: 400 });
  }

  const hash = crypto
    .createHmac("sha512", process.env.PAYSTACK_SECRET_KEY || "")
    .update(body)
    .digest("hex");

  // Constant-time comparison — prevents timing-based signature forgery
  const hashBuf = Buffer.from(hash);
  const sigBuf  = Buffer.from(signature);
  const valid   = hashBuf.length === sigBuf.length && crypto.timingSafeEqual(hashBuf, sigBuf);

  if (!valid) {
    console.warn("[webhook] Invalid signature — possible forgery attempt");
    return new Response("Unauthorized", { status: 401 });
  }

  // ── 2. Parse event ────────────────────────────────────────────────
  let event;
  try { event = JSON.parse(body); }
  catch { return new Response("Invalid JSON", { status: 400 }); }

  console.log(`[webhook] Event received: ${event.event}`);

  // ── 3. Route to correct handler ───────────────────────────────────
  if (event.event === "charge.success") {
    // Customer paid via Paystack popup / invoice link (card payment)
    await handleChargeSuccess(event.data);

  } else if (event.event === "dedicatedaccount.transfer.success") {
    // Customer sent a bank transfer to the tailor's virtual account
    await handleVirtualAccountTransfer(event.data);

  } else if (event.event === "transfer.success") {
    // OUTBOUND transfer (BOSS sending money TO a tailor's bank).
    // Do NOT credit wallet — just log.
    console.log(`[webhook] Outbound transfer confirmed: ${event.data?.transfer_code}`);

  } else {
    console.log(`[webhook] Unhandled event type: ${event.event}`);
  }

  // Always return 200 quickly — Paystack retries on non-200
  return new Response("OK", { status: 200 });
}

// ── charge.success — card payment via invoice link ────────────────
async function handleChargeSuccess(data) {
  const ref       = data.reference;
  const amountNGN = data.amount / 100;

  // Reference format: BOSS_<orderId>_<timestamp>
  const parts   = (ref || "").split("_");
  const orderId = parts[1] || null;

  console.log(`[webhook] charge.success ₦${amountNGN} ref=${ref}`);

  try {
    const supabase = getSupabase();

    // T-01: Idempotency guard — Paystack retries on any non-200; skip duplicates
    const { data: existingPayment } = await supabase
      .from("payments")
      .select("id")
      .eq("paystack_ref", ref)
      .maybeSingle();
    if (existingPayment) {
      console.log(`[webhook] Idempotency: charge.success ref=${ref} already processed, skipping`);
      return;
    }

    // Find the order
    if (orderId) {
      const { data: order, error } = await supabase
        .from("orders")
        .select("id, paid, tailor_id, price, deposit")
        .eq("id", orderId)
        .single();

      if (error || !order) {
        console.warn(`[webhook] Order not found for ref ${ref}`);
      } else {
        // Update order paid amount
        const newPaid = (parseFloat(order.paid) || 0) + amountNGN;
        await supabase
          .from("orders")
          .update({ paid: newPaid, paystack_ref: ref })
          .eq("id", orderId);

        // Credit tailor wallet
        await creditWallet(supabase, order.tailor_id, amountNGN);

        // Record payment
        await supabase.from("payments").insert({
          order_id:    orderId,
          tailor_id:   order.tailor_id,
          amount:      amountNGN,
          method:      "paystack",
          paystack_ref: ref,
        });

        // Update BOSS score
        await updateBosScore(supabase, order.tailor_id);

        console.log(`[webhook] ✅ charge.success ₦${amountNGN} → order ${orderId}`);
        return;
      }
    }

    // No orderId in ref — record as unmatched payment
    console.warn(`[webhook] charge.success with no orderId in ref: ${ref}`);

  } catch (err) {
    console.error("[webhook] handleChargeSuccess error:", err);
  }
}

// ── dedicatedaccount.transfer.success — virtual account transfer ──
async function handleVirtualAccountTransfer(data) {
  const amountNGN  = (data.amount || 0) / 100;

  // The virtual account number that received this transfer
  const virtualAccountNumber =
    data.dedicated_account?.account_number ||
    data.recipient?.account_number ||
    null;

  const transferCode = data.transfer_code || null;
  const senderName   = data.customer?.name || data.source?.identifier || null;

  console.log(`[webhook] dedicatedaccount.transfer.success ₦${amountNGN} → VA ${virtualAccountNumber}`);

  if (!virtualAccountNumber) {
    console.warn("[webhook] No virtual account number in event data:", JSON.stringify(data));
    return;
  }

  try {
    const supabase = getSupabase();

    // T-01: Idempotency guard — skip if this transfer_code was already processed
    if (transferCode) {
      const { data: existingTransfer } = await supabase
        .from("payments")
        .select("id")
        .eq("transfer_code", transferCode)
        .maybeSingle();
      if (existingTransfer) {
        console.log(`[webhook] Idempotency: transfer_code=${transferCode} already processed, skipping`);
        return;
      }
    }

    // Find the tailor who owns this virtual account
    const { data: tailor, error: tailorErr } = await supabase
      .from("tailors")
      .select("id, shop, wallet_balance")
      .eq("virtual_account_number", virtualAccountNumber)
      .single();

    if (tailorErr || !tailor) {
      console.warn(`[webhook] No tailor found for virtual account: ${virtualAccountNumber}`);
      return;
    }

    // Record the payment (order_id null until matched)
    const { data: payment, error: payErr } = await supabase
      .from("payments")
      .insert({
        tailor_id:              tailor.id,
        amount:                 amountNGN,
        method:                 "virtual_account",
        virtual_account_number: virtualAccountNumber,
        transfer_code:          transferCode,
        sender_name:            senderName,
        order_id:               null,
      })
      .select()
      .single();

    if (payErr) {
      console.error("[webhook] Payment insert error:", payErr);
    }

    // Credit the tailor's wallet balance
    await creditWallet(supabase, tailor.id, amountNGN);

    // Auto-match to an outstanding order by exact balance amount
    const { data: orders } = await supabase
      .from("orders")
      .select("id, price, deposit, paid")
      .eq("tailor_id", tailor.id)
      .neq("status", "Delivered")
      .order("created_at", { ascending: true }); // oldest first

    const match = (orders || []).find(o => {
      const bal = (parseFloat(o.price) || 0) - (parseFloat(o.deposit) || 0) - (parseFloat(o.paid) || 0);
      return bal > 0 && Math.abs(bal - amountNGN) < 1; // within ₦1 tolerance
    });

    if (match) {
      const newPaid = (parseFloat(match.paid) || 0) + amountNGN;
      await supabase.from("orders").update({ paid: newPaid }).eq("id", match.id);
      if (payment?.id) {
        await supabase.from("payments").update({ order_id: match.id }).eq("id", payment.id);
      }
      console.log(`[webhook] ✅ Auto-matched ₦${amountNGN} → order ${match.id} (${tailor.shop})`);
    } else {
      console.log(`[webhook] ⚠️ ₦${amountNGN} unmatched — recorded for ${tailor.shop}, tailor must assign manually`);
    }

    // Update BOSS Trust Score
    await updateBosScore(supabase, tailor.id);

  } catch (err) {
    console.error("[webhook] handleVirtualAccountTransfer error:", err);
  }
}

// ── Credit tailor wallet balance ──────────────────────────────────
// wallet_balance is the total funds sitting in BOSS for the tailor.
// It grows on every inbound payment, and decreases on withdrawal.
async function creditWallet(supabase, tailorId, amountNGN) {
  // PARTIAL-03: Fallback read-modify-write REMOVED — race condition risk.
  // RPC is the ONLY code path. If it fails we throw so the caller logs it.
  const { error } = await supabase.rpc("increment_wallet_balance", {
    p_tailor_id: tailorId,
    p_amount:    amountNGN,
  });

  if (error) {
    console.error(
      "[webhook] CRITICAL: increment_wallet_balance RPC failed.",
      "Wallet NOT credited. Verify function is deployed in Supabase.",
      "Tailor:", tailorId, "Amount: NGN" + amountNGN,
      "Error:", error.message
    );
    throw new Error("Wallet RPC failed: " + error.message);
  }

  console.log("[webhook] Wallet +NGN" + amountNGN + " for tailor " + tailorId);
}

// ── Recompute and persist BOSS Trust Score ────────────────────────
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

    // PARTIAL-02: Correct formula — fraction of customers who placed >1 order
    const ordersByCustomer = {};
    orders.forEach(o => {
      ordersByCustomer[o.customer_id] = (ordersByCustomer[o.customer_id] || 0) + 1;
    });
    const uniqueCustomers = Object.keys(ordersByCustomer).length;
    const repeatCustomers = Object.values(ordersByCustomer).filter(c => c > 1).length;
    const repeatRate      = uniqueCustomers > 0 ? repeatCustomers / uniqueCustomers : 0;

    const fullyPaid      = orders.filter(o =>
      o.status === "Delivered" &&
      ((parseFloat(o.price) || 0) - (parseFloat(o.deposit) || 0) - (parseFloat(o.paid) || 0)) <= 0
    ).length;
    const paymentRate    = delivered > 0 ? fullyPaid / delivered : 0;

    const revenue        = orders.reduce((s, o) => s + (parseFloat(o.deposit) || 0) + (parseFloat(o.paid) || 0), 0);
    const revenueScore   = Math.min(1, (total > 0 ? revenue / total : 0) / 50000);

    const now            = new Date();
    const overdue        = orders.filter(o =>
      o.status !== "Delivered" && o.delivery_date && new Date(o.delivery_date) < now
    ).length;
    const penalty        = Math.min(0.3, overdue * 0.05);

    const raw   = (completionRate * 30) + (repeatRate * 25) + (paymentRate * 25) + (revenueScore * 20) - (penalty * 100);
    const score = Math.max(0, Math.min(100, Math.round(raw)));

    await supabase.from("tailors")
      .update({ bos_score: score, bos_score_updated_at: new Date().toISOString() })
      .eq("id", tailorId);

    // MISSING-04: Persist score history for audit trail and lender trend queries
    supabase.from("bos_score_history").insert({
      tailor_id:       tailorId,
      score,
      computed_at:     new Date().toISOString(),
      order_count:     total,
      completion_rate: Math.round(completionRate * 100),
      repeat_rate:     Math.round(repeatRate * 100),
      payment_rate:    Math.round(paymentRate * 100),
      overdue_count:   overdue,
    }).then(({ error: histErr }) => {
      if (histErr) console.warn("[webhook] bos_score_history insert (non-fatal):", histErr.message);
    });

    console.log("[webhook] BOSS Score:", score, "for tailor", tailorId);
  } catch (err) {
    console.error("[webhook] updateBosScore error:", err);
  }
}
