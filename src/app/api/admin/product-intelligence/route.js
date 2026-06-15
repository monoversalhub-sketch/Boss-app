import { NextResponse } from "next/server";
import { getJourneyAnalytics, getFeatureIntelligence } from "@/lib/admin/analytics";

export async function GET() {
  try {
    const [journeys, features] = await Promise.all([
      getJourneyAnalytics(30),
      getFeatureIntelligence(30),
    ]);
    return NextResponse.json({ journeys, features });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
