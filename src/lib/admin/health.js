import { computeMetrics } from "./metrics";

export function categorizeHealth(metrics) {
  const {
    totalOrders, completionRate, repeatCustomerRate,
    overdueOrders, paymentsCount, uniqueCustomers,
  } = metrics;

  const orderActive = totalOrders >= 5;
  const completing = completionRate >= 60;
  const retained = repeatCustomerRate >= 30;
  const noOverdue = overdueOrders === 0;
  const paying = paymentsCount >= 3;
  const growingCustomerBase = uniqueCustomers >= 5;

  const positives = [orderActive, completing, retained, noOverdue, paying, growingCustomerBase];
  const score = Math.round(positives.filter(Boolean).length / positives.length * 100);

  if (score >= 80 && orderActive && completing) return { score, category: "healthy" };
  if (score >= 50 && orderActive) return { score, category: "growing" };
  if (score >= 25 && totalOrders > 0) return { score, category: "at_risk" };
  return { score, category: "dormant" };
}

export async function computeAndSaveHealthScore(tailorId) {
  const metrics = await computeMetrics(tailorId);
  const { score, category } = categorizeHealth(metrics);
  const client = await (await import("../db")).getEffectiveClient();

  await client.from("business_health_scores").upsert({
    tailor_id: tailorId,
    score,
    category,
    order_activity_score: Math.round((metrics.totalOrders / 50) * 100),
    payment_activity_score: Math.round((metrics.paymentsCount / 20) * 100),
    customer_retention_score: metrics.repeatCustomerRate,
    overdue_jobs_penalty: metrics.overdueOrders * 10,
    app_usage_score: metrics.totalOrders > 0 ? 60 : 0,
    computed_at: new Date().toISOString(),
  }, { onConflict: "tailor_id" });

  return { score, category, metrics };
}

export async function computeAllHealthScores() {
  const client = await (await import("../db")).getEffectiveClient();
  const { data: tailors } = await client.from("tailors").select("id");
  if (!tailors?.length) return [];

  const results = [];
  for (const t of tailors) {
    try {
      const result = await computeAndSaveHealthScore(t.id);
      results.push({ tailorId: t.id, ...result });
    } catch { /* skip individual failures */ }
  }
  return results;
}
