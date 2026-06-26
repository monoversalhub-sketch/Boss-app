export async function computeMetrics(tailorId) {
  const client = await (await import("../db")).getEffectiveClient();
  const now = new Date();
  const today = now.toISOString().split("T")[0];
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000).toISOString();

  const [{ data: orders }, { data: customers }, { data: payments }] = await Promise.all([
    client.from("orders").select("*").eq("tailor_id", tailorId),
    client.from("customers").select("*").eq("tailor_id", tailorId),
    client.from("payments").select("*").eq("tailor_id", tailorId).gte("recorded_at", thirtyDaysAgo),
  ]);

  const totalOrders = orders?.length || 0;
  const deliveredOrders = orders?.filter(o => o.status === "Delivered").length || 0;
  const todayOrders = orders?.filter(o => o.created_at?.startsWith(today)).length || 0;
  const completionRate = totalOrders > 0 ? (deliveredOrders / totalOrders) : 0;

  const revenue = orders?.reduce((s, o) => {
    const deposit = parseFloat(o.deposit) || 0;
    const paid = parseFloat(o.paid) || 0;
    return s + deposit + paid;
  }, 0) || 0;

  const customerIds = [...new Set(orders?.map(o => o.customer_id).filter(Boolean))];
  const uniqueCustomers = customerIds.length;
  const ordersPerCustomer = {};
  orders?.forEach(o => {
    if (o.customer_id) ordersPerCustomer[o.customer_id] = (ordersPerCustomer[o.customer_id] || 0) + 1;
  });
  const repeatCustomers = Object.values(ordersPerCustomer).filter(c => c > 1).length;
  const repeatCustomerRate = uniqueCustomers > 0 ? (repeatCustomers / uniqueCustomers) : 0;

  const overdueOrders = orders?.filter(o =>
    o.status !== "Delivered" && o.delivery_date && new Date(o.delivery_date) < now
  ).length || 0;

  const unpaidBalances = orders?.filter(o => {
    const price = parseFloat(o.price) || 0;
    const deposit = parseFloat(o.deposit) || 0;
    const paid = parseFloat(o.paid) || 0;
    return o.status !== "Delivered" && (price - deposit - paid) > 0;
  }).length || 0;

  const totalPaid = payments?.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0) || 0;

  const totalCustomers = customers?.length || 0;

  return {
    totalOrders,
    todayOrders,
    deliveredOrders,
    completionRate: Math.round(completionRate * 100),
    revenue: Math.round(revenue),
    totalCustomers,
    uniqueCustomers,
    repeatCustomerRate: Math.round(repeatCustomerRate * 100),
    overdueOrders,
    unpaidBalances,
    paymentsCount: payments?.length || 0,
    totalPaid: Math.round(totalPaid),
    avgOrderValue: totalOrders > 0 ? Math.round(revenue / totalOrders) : 0,
    customerRetentionRate: Math.round((uniqueCustomers > 1 ? (repeatCustomers / uniqueCustomers) : 0) * 100),
  };
}

export async function computeAggregateMetrics() {
  const client = await (await import("../db")).getEffectiveClient();
  const now = new Date();
  const today = now.toISOString().split("T")[0];

  const [
    { count: totalTailors },
    { data: allOrders },
    { data: paymentsData },
    { data: allCustomers },
    { data: healthData },
    { data: churnData },
    { data: trustData },
  ] = await Promise.all([
    client.from("tailors").select("id", { count: "exact", head: true }),
    client.from("orders").select("id, price, deposit, paid, status, delivery_date, customer_id, tailor_id, created_at"),
    client.from("payments").select("amount, recorded_at").gte("recorded_at", today),
    client.from("customers").select("id, tailor_id"),
    client.from("business_health_scores").select("*"),
    client.from("churn_risk").select("tailor_id, risk_level"),
    client.from("tailors").select("id, bos_score, shop, created_at, last_active_at"),
  ]);

  const activeBusinesses = trustData?.filter(t =>
    t.last_active_at && new Date(t.last_active_at) > new Date(now.getTime() - 30 * 86400000)
  ).length || 0;

  const todayOrders = allOrders?.filter(o => o.created_at?.startsWith(today)).length || 0;
  const todayPayments = paymentsData?.length || 0;
  const todayRevenue = paymentsData?.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0) || 0;

  const revenue = allOrders?.reduce((s, o) => {
    return s + (parseFloat(o.deposit) || 0) + (parseFloat(o.paid) || 0);
  }, 0) || 0;

  const ordersByCustomer = {};
  allOrders?.forEach(o => {
    if (o.customer_id) ordersByCustomer[o.customer_id] = (ordersByCustomer[o.customer_id] || 0) + 1;
  });
  const uniqueCustomers = Object.keys(ordersByCustomer).length;
  const repeatCustomers = Object.values(ordersByCustomer).filter(c => c > 1).length;
  const repeatCustomerRate = uniqueCustomers > 0 ? (repeatCustomers / uniqueCustomers) : 0;

  const scoreDistribution = { "0-20": 0, "21-40": 0, "41-60": 0, "61-80": 0, "81-100": 0 };
  trustData?.forEach(t => {
    const s = t.bos_score || 0;
    if (s <= 20) scoreDistribution["0-20"]++;
    else if (s <= 40) scoreDistribution["21-40"]++;
    else if (s <= 60) scoreDistribution["41-60"]++;
    else if (s <= 80) scoreDistribution["61-80"]++;
    else scoreDistribution["81-100"]++;
  });

  const churnRisks = churnData?.filter(c => c.risk_level === "high" || c.risk_level === "critical").length || 0;
  const healthyBiz = healthData?.filter(h => h.category === "healthy").length || 0;
  const growingBiz = healthData?.filter(h => h.category === "growing").length || 0;
  const atRiskBiz = healthData?.filter(h => h.category === "at_risk").length || 0;
  const dormantBiz = healthData?.filter(h => h.category === "dormant").length || 0;
  const inactiveBiz = Math.max(0, (totalTailors || 0) - activeBusinesses);

  const totalOrdersCount = allOrders?.length || 0;
  const totalCustomersCount = allCustomers?.length || 0;

  return {
    totalBusinesses: totalTailors || 0,
    activeBusinesses,
    inactiveBusinesses: inactiveBiz,
    ordersCreatedToday: todayOrders,
    paymentsRecordedToday: todayPayments,
    revenueToday: Math.round(todayRevenue),
    totalRevenue: Math.round(revenue),
    repeatCustomerRate: Math.round(repeatCustomerRate * 100),
    trustScoreDistribution: scoreDistribution,
    churnRiskUsers: churnRisks,
    healthyBusinesses: healthyBiz,
    growingBusinesses: growingBiz,
    atRiskBusinesses: atRiskBiz,
    dormantBusinesses: dormantBiz,
    totalOrders: totalOrdersCount,
    totalCustomers: totalCustomersCount,
    avgScore: trustData?.length
      ? Math.round(trustData.reduce((s, t) => s + (t.bos_score || 0), 0) / trustData.length)
      : 0,
  };
}
