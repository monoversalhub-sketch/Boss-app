import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase/admin";

export async function GET(request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const client = getAdminClient();

  try {
    const { count: tailorCount, error: tErr } = await client
      .from("tailors")
      .select("id", { count: "exact", head: true });
    if (tErr) return NextResponse.json({ error: "tailors: " + tErr.message });

    const { count: orderCount, error: oErr } = await client
      .from("orders")
      .select("id", { count: "exact", head: true });
    if (oErr) return NextResponse.json({ error: "orders: " + oErr.message });

    const { count: customerCount, error: cErr } = await client
      .from("customers")
      .select("id", { count: "exact", head: true });
    if (cErr) return NextResponse.json({ error: "customers: " + cErr.message });

    const { count: paymentCount, error: pErr } = await client
      .from("payments")
      .select("id", { count: "exact", head: true });
    if (pErr) return NextResponse.json({ error: "payments: " + pErr.message });

    const { data: healthCount, error: hErr } = await client
      .from("business_health_scores")
      .select("tailor_id");
    if (hErr) return NextResponse.json({ error: "health: " + hErr.message });

    const { data: churnCount, error: chErr } = await client
      .from("churn_risk")
      .select("tailor_id");
    if (chErr) return NextResponse.json({ error: "churn: " + chErr.message });

    const { data: creditCount, error: crErr } = await client
      .from("credit_readiness")
      .select("tailor_id");
    if (crErr) return NextResponse.json({ error: "credit: " + crErr.message });

    const { count: adminCount, error: aErr } = await client
      .from("admin_users")
      .select("id", { count: "exact", head: true });
    if (aErr) return NextResponse.json({ error: "admin_users: " + aErr.message });

    const adminUsers = await client.from("admin_users").select("id, email, role");

    return NextResponse.json({
      tailors: tailorCount,
      orders: orderCount,
      customers: customerCount,
      payments: paymentCount,
      healthScores: healthCount?.length || 0,
      churnRisks: churnCount?.length || 0,
      creditReadiness: creditCount?.length || 0,
      adminUsers: adminUsers?.data?.length || 0,
      adminList: adminUsers?.data || [],
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
