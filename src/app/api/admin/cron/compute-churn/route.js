import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { computeAndSaveChurnRisk } from "@/lib/admin/churn";

export async function GET(request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const client = getAdminClient();
    const { data: tailors, error: tErr } = await client.from("tailors").select("id");
    if (tErr) return NextResponse.json({ error: "Tailor query failed: " + tErr.message }, { status: 500 });

    const errors = [];
    const results = [];
    for (const t of tailors || []) {
      try {
        const r = await computeAndSaveChurnRisk(t.id);
        if (r) results.push(r);
        else errors.push({ tailorId: t.id, error: "returned null" });
      } catch (e) {
        errors.push({ tailorId: t.id, error: e.message || String(e) });
      }
    }

    return NextResponse.json({
      success: true,
      computed: results.length,
      total: tailors?.length || 0,
      errors,
      critical: results.filter(r => r.riskLevel === "critical").length,
      high: results.filter(r => r.riskLevel === "high").length,
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
