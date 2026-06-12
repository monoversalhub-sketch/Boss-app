export async function computeCreditReadiness(tailorId) {
  const client = await (await import("../db")).getBrowserClient();

  const { data: orders } = await client
    .from("orders")
    .select("created_at, price, deposit, paid, status, delivery_date, customer_id")
    .eq("tailor_id", tailorId)
    .order("created_at", { ascending: true });

  if (!orders?.length) return null;

  const { data: history } = await client
    .from("trust_score_history")
    .select("score, computed_at")
    .eq("tailor_id", tailorId)
    .order("computed_at", { ascending: true });

  const totalOrders = orders.length;
  const deliveredOrders = orders.filter(o => o.status === "Delivered").length;
  const deliveryReliability = totalOrders > 0 ? deliveredOrders / totalOrders : 0;

  const monthlyRevenue = {};
  orders.forEach(o => {
    const month = o.created_at?.substring(0, 7);
    if (month) {
      monthlyRevenue[month] = (monthlyRevenue[month] || 0)
        + (parseFloat(o.deposit) || 0) + (parseFloat(o.paid) || 0);
    }
  });
  const revenues = Object.values(monthlyRevenue);
  const avgMonthlyRevenue = revenues.length ? revenues.reduce((s, r) => s + r, 0) / revenues.length : 0;

  const revenueVolatility = revenues.length > 1
    ? Math.round(Math.sqrt(revenues.reduce((s, r) => s + (r - avgMonthlyRevenue) ** 2, 0) / revenues.length) / (avgMonthlyRevenue || 1) * 100)
    : 100;

  const customerIds = [...new Set(orders.map(o => o.customer_id).filter(Boolean))];
  const ordersPerCustomer = {};
  orders.forEach(o => {
    if (o.customer_id) ordersPerCustomer[o.customer_id] = (ordersPerCustomer[o.customer_id] || 0) + 1;
  });
  const repeatCustomers = Object.values(ordersPerCustomer).filter(c => c > 1).length;
  const retentionRate = customerIds.length > 0 ? repeatCustomers / customerIds.length : 0;

  const monthsOfData = Object.keys(monthlyRevenue).length;
  const lastScores = history?.slice(-5).map(h => h.score) || [];
  const scoreTrend = lastScores.length >= 2
    ? lastScores[lastScores.length - 1] - lastScores[0]
    : 0;

  const onTimeDeliveries = orders.filter(o => {
    if (o.status !== "Delivered" || !o.delivery_date) return false;
    return new Date(o.created_at) <= new Date(o.delivery_date);
  }).length;
  const deliveryTimeliness = deliveredOrders > 0 ? onTimeDeliveries / deliveredOrders : 0;

  const paymentConsistency = orders.filter(o => {
    const price = parseFloat(o.price) || 0;
    const deposit = parseFloat(o.deposit) || 0;
    const paid = parseFloat(o.paid) || 0;
    return o.status === "Delivered" && (price - deposit - paid) <= 0;
  }).length / Math.max(1, deliveredOrders);

  const creditReady = monthsOfData >= 3 && deliveryReliability >= 0.7 && avgMonthlyRevenue >= 50000;
  const estimatedLimit = creditReady ? Math.round(avgMonthlyRevenue * 0.5 * (deliveryReliability * 0.7 + paymentConsistency * 0.3)) : 0;

  const result = {
    trustScoreHistory: history || [],
    paymentConsistency: Math.round(paymentConsistency * 100),
    deliveryReliability: Math.round(deliveryReliability * 100),
    deliveryTimeliness: Math.round(deliveryTimeliness * 100),
    customerRetentionRate: Math.round(retentionRate * 100),
    monthlyRevenueAvg: Math.round(avgMonthlyRevenue),
    revenueVolatility,
    monthsOfData,
    creditReady,
    estimatedCreditLimit: estimatedLimit,
    scoreTrend,
    totalOrders,
    avgOrderValue: totalOrders > 0
      ? Math.round(orders.reduce((s, o) => s + (parseFloat(o.price) || 0), 0) / totalOrders)
      : 0,
  };

  await client.from("credit_readiness").upsert({
    tailor_id: tailorId,
    trust_score_history: history || [],
    payment_consistency: result.paymentConsistency,
    delivery_reliability: result.deliveryReliability,
    customer_retention_rate: result.customerRetentionRate,
    monthly_revenue_avg: result.monthlyRevenueAvg,
    revenue_volatility: result.revenueVolatility,
    months_of_data: result.monthsOfData,
    credit_ready: result.creditReady,
    estimated_credit_limit: result.estimatedLimit,
    computed_at: new Date().toISOString(),
  }, { onConflict: "tailor_id" });

  return result;
}

export async function getCreditIntelligence() {
  const client = await (await import("../db")).getBrowserClient();

  const [{ data: creditData }, { data: tailors }] = await Promise.all([
    client.from("credit_readiness")
      .select("*, tailor:tailors(name, email, phone)")
      .order("monthly_revenue_avg", { ascending: false }),
    client.from("tailors").select("id, name"),
  ]);

  const creditReady = creditData?.filter(c => c.credit_ready) || [];
  const nearReady = creditData?.filter(c => !c.credit_ready && c.months_of_data >= 2) || [];

  return {
    all: creditData || [],
    creditReady,
    nearReady,
    totalCreditReady: creditReady.length,
    totalNearReady: nearReady.length,
    averageRevenue: creditData?.length
      ? Math.round(creditData.reduce((s, c) => s + (c.monthly_revenue_avg || 0), 0) / creditData.length)
      : 0,
    totalLendingCapacity: creditReady.reduce((s, c) => s + (c.estimated_credit_limit || 0), 0),
  };
}
