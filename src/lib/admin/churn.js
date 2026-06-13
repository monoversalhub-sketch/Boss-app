import { computeMetrics } from "./metrics";

export function computeChurnRisk(metrics, lastActiveDate) {
  const now = new Date();
  const lastActive = lastActiveDate ? new Date(lastActiveDate) : null;
  const daysSinceLastActive = lastActive
    ? Math.floor((now - lastActive) / 86400000)
    : 999;

  const {
    totalOrders, completionRate, repeatCustomerRate,
    overdueOrders, paymentsCount,
  } = metrics;

  let riskScore = 0;

  if (daysSinceLastActive > 60) riskScore += 35;
  else if (daysSinceLastActive > 30) riskScore += 25;
  else if (daysSinceLastActive > 14) riskScore += 15;
  else if (daysSinceLastActive > 7) riskScore += 5;

  if (totalOrders === 0) riskScore += 20;
  else if (totalOrders < 3) riskScore += 10;

  if (completionRate < 30) riskScore += 15;
  else if (completionRate < 60) riskScore += 8;

  if (repeatCustomerRate < 10) riskScore += 10;

  if (overdueOrders > 3) riskScore += 10;
  else if (overdueOrders > 0) riskScore += 5;

  if (paymentsCount === 0 && totalOrders > 0) riskScore += 10;

  riskScore = Math.min(100, Math.max(0, riskScore));

  const ordersDeclining = totalOrders < 3;
  const paymentsDeclining = paymentsCount === 0;

  let riskLevel = "low";
  if (riskScore >= 70) riskLevel = "critical";
  else if (riskScore >= 50) riskLevel = "high";
  else if (riskScore >= 25) riskLevel = "medium";

  let intervention = null;
  if (riskLevel === "critical") intervention = "Urgent: Reach out personally. Offer onboarding assistance.";
  else if (riskLevel === "high") intervention = "Send re-engagement email with tips and case studies.";
  else if (riskLevel === "medium" && daysSinceLastActive > 14)
    intervention = "Push notification: 'You have orders waiting.'";

  return {
    riskScore,
    riskLevel,
    daysSinceLastActive,
    ordersDeclining,
    paymentsDeclining,
    interventionRecommended: intervention,
  };
}

export async function computeAndSaveChurnRisk(tailorId) {
  const client = await (await import("../db")).getEffectiveClient();

  const { data: tailors, error: tailorErr } = await client
    .from("tailors")
    .select("id, last_active_at")
    .eq("id", tailorId);

  if (tailorErr) {
    console.error("churn.js tailor query error:", tailorErr);
    return null;
  }

  if (!tailors?.length) {
    console.error("churn.js no tailor found for:", tailorId);
    return null;
  }

  const tailor = tailors[0];

  try {
    const metrics = await computeMetrics(tailorId);
    const risk = computeChurnRisk(metrics, tailor.last_active_at);

    const { error: upsertErr } = await client.from("churn_risk").upsert({
      tailor_id: tailorId,
      risk_score: risk.riskScore,
      risk_level: risk.riskLevel,
      days_since_last_active: risk.daysSinceLastActive,
      orders_declining: risk.ordersDeclining,
      payments_declining: risk.paymentsDeclining,
      intervention_recommended: risk.interventionRecommended,
      computed_at: new Date().toISOString(),
    }, { onConflict: "tailor_id" });

    if (upsertErr) {
      console.error("churn.js upsert error:", upsertErr);
      return null;
    }

    return { tailorId, ...risk, metrics };
  } catch (err) {
    console.error("churn.js compute error:", err);
    return null;
  }
}

export async function getChurnIntelligence() {
  const client = await (await import("../db")).getEffectiveClient();

  const [{ data: churnData }, { data: tailors }] = await Promise.all([
    client.from("churn_risk").select("*, tailor:tailors(name, email, phone)").order("risk_score", { ascending: false }),
    client.from("tailors").select("id, last_active_at"),
  ]);

  const critical = churnData?.filter(c => c.risk_level === "critical") || [];
  const high = churnData?.filter(c => c.risk_level === "high") || [];
  const medium = churnData?.filter(c => c.risk_level === "medium") || [];
  const low = churnData?.filter(c => c.risk_level === "low") || [];

  const allInactive = tailors?.filter(t => {
    if (!t.last_active_at) return true;
    return (new Date() - new Date(t.last_active_at)) / 86400000 > 30;
  }) || [];

  return {
    all: churnData || [],
    critical,
    high,
    medium,
    low,
    totalAtRisk: critical.length + high.length,
    inactiveUsers: allInactive.length,
    byLevel: { critical: critical.length, high: high.length, medium: medium.length, low: low.length },
  };
}
