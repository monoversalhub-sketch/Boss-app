import { NextResponse } from "next/server";
import { getBrowserClient } from "@/lib/db";
import { computeAndSaveChurnRisk } from "@/lib/admin/churn";

export async function GET(request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const client = await getBrowserClient();
    const { data: tailors } = await client.from("tailors").select("id");
    const results = [];
    for (const t of tailors || []) {
      try {
        const r = await computeAndSaveChurnRisk(t.id);
        if (r) results.push(r);
      } catch { /* skip */ }
    }
    return NextResponse.json({
      success: true,
      computed: results.length,
      critical: results.filter(r => r.riskLevel === "critical").length,
      high: results.filter(r => r.riskLevel === "high").length,
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
