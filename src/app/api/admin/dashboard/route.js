import { NextResponse } from "next/server";
import { computeAggregateMetrics } from "@/lib/admin/metrics";
import { getChurnIntelligence } from "@/lib/admin/churn";
import { getTrustScoreIntelligence } from "@/lib/admin/trust-score";

export async function GET() {
  try {
    const [metrics, churn, trust] = await Promise.all([
      computeAggregateMetrics(),
      getChurnIntelligence(),
      getTrustScoreIntelligence(),
    ]);
    return NextResponse.json({ metrics, churn, trust });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
