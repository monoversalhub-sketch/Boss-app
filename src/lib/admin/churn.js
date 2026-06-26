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

  const { data: tailors } = await client
    .from("tailors")
    .select("id, last_active_at")
    .eq("id", tailorId);

  if (!tailors?.length) return null;

  const tailor = tailors[0];
  const metrics = await computeMetrics(tailorId);
  const risk = computeChurnRisk(metrics, tailor.last_active_at);

  await client.from("churn_risk").upsert({
    tailor_id: tailorId,
    risk_score: risk.riskScore,
    risk_level: risk.riskLevel,
    days_since_last_active: risk.daysSinceLastActive,
    orders_declining: risk.ordersDeclining,
    payments_declining: risk.paymentsDeclining,
    intervention_recommended: risk.interventionRecommended,
    computed_at: new Date().toISOString(),
  }, { onConflict: "tailor_id" });

  return { tailorId, ...risk, metrics };
}

export async function getChurnIntelligence() {
  try {
    const client = await (await import("../db")).getEffectiveClient();

    const [churnResult, tailorsResult] = await Promise.all([
      client.from("churn_risk").select("*").order("risk_score", { ascending: false }),
      client.from("tailors").select("id, shop, last_active_at"),
    ]);

    if (churnResult.error) throw new Error("churn_risk query: " + churnResult.error.message);
    if (tailorsResult.error) throw new Error("tailors query: " + tailorsResult.error.message);

    const churnData = churnResult.data || [];
    const tailors = tailorsResult.data || [];

    // Build tailor lookup (manual join)
    const tailorMap = {};
    tailors.forEach(t => { tailorMap[t.id] = { shop: t.shop, phone: null }; });

    // Attach tailor info to each churn row
    const all = churnData.map(c => ({
      ...c,
      tailor: tailorMap[c.tailor_id] || null,
    }));

    const critical = all.filter(c => c.risk_level === "critical");
    const high = all.filter(c => c.risk_level === "high");
    const medium = all.filter(c => c.risk_level === "medium");
    const low = all.filter(c => c.risk_level === "low");

    const allInactive = tailors.filter(t => {
      if (!t.last_active_at) return true;
      return (new Date() - new Date(t.last_active_at)) / 86400000 > 30;
    });

    return {
      all,
      critical,
      high,
      medium,
      low,
      totalAtRisk: critical.length + high.length,
      inactiveUsers: allInactive.length,
      byLevel: { critical: critical.length, high: high.length, medium: medium.length, low: low.length },
    };
  } catch (err) {
    console.error("[getChurnIntelligence]", err);
    return {
      all: [], critical: [], high: [], medium: [], low: [],
      totalAtRisk: 0, inactiveUsers: 0,
      byLevel: { critical: 0, high: 0, medium: 0, low: 0 },
    };
  }
}
