import { NextResponse } from "next/server";
import { getTrustScoreIntelligence } from "@/lib/admin/trust-score";

export async function GET() {
  try {
    const data = await getTrustScoreIntelligence();
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
