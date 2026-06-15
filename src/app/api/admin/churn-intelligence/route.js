import { NextResponse } from "next/server";
import { getChurnIntelligence } from "@/lib/admin/churn";

export async function GET() {
  try {
    const data = await getChurnIntelligence();
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
