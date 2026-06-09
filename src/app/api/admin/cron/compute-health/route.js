import { NextResponse } from "next/server";
import { computeAllHealthScores } from "@/lib/admin/health";

export async function GET(request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const results = await computeAllHealthScores();
    return NextResponse.json({
      success: true,
      computed: results.length,
      healthy: results.filter(r => r.category === "healthy").length,
      atRisk: results.filter(r => r.category === "at_risk" || r.category === "dormant").length,
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
