// src/components/boss/helpers.js
// ─────────────────────────────────────────────────────────────────
//  T-09: Pure helper functions extracted from BOSSApp.jsx
//  All functions here are pure (no React state, no side effects).
// ─────────────────────────────────────────────────────────────────
import { APP_URL, SERVICE_FEE } from "./tokens";

// ─────────────────────────────────────────
// PRIMITIVE UTILS
// ─────────────────────────────────────────
// T-03: crypto.randomUUID() — no collisions (was base-36 hash)
export const uid   = () => crypto.randomUUID();
export const fmt   = (n) => "₦" + (Number(n) || 0).toLocaleString("en-NG");
export const today = () => new Date().toISOString().slice(0, 10);

export function fmtDate(d) {
  if (!d) return "—";
  return new Date(d + "T00:00:00").toLocaleDateString("en-NG", {
    day: "numeric", month: "short", year: "numeric",
  });
}

export function invoiceUrl(orderId) {
  return `${APP_URL}/invoice/${orderId}`;
}

// ─────────────────────────────────────────
// ORDER FINANCIALS
// ─────────────────────────────────────────
export function getBalance(order) {
  return Math.max(0,
    (parseFloat(order.price) || 0) -
    (parseFloat(order.deposit) || 0) -
    (parseFloat(order.paid) || 0)
  );
}

export function getTotalPaid(order) {
  return (parseFloat(order.deposit) || 0) + (parseFloat(order.paid) || 0);
}

export function getPaymentState(order) {
  const total = parseFloat(order.price) || 0;
  const paid  = getTotalPaid(order);
  if (total === 0) return "unpaid";
  if (paid <= 0)   return "unpaid";
  if (paid >= total) return "fully_paid";
  return "partially_paid";
}

export function getServiceFee(order) {
  return getPaymentState(order) === "fully_paid" ? SERVICE_FEE : 0;
}

export function getNetEarning(order) {
  return Math.max(0, getTotalPaid(order) - getServiceFee(order));
}

// ─────────────────────────────────────────
// ORDER STATUS HELPERS
// ─────────────────────────────────────────
export function orderStatus(o) { return o.status || "In Progress"; }
export function isOverdue(o) {
  if (!o.date || orderStatus(o) === "Delivered") return false;
  return o.date < today();
}
export function isDueToday(o) {
  if (!o.date || orderStatus(o) === "Delivered") return false;
  return o.date === today();
}
export function allOrders(customers) {
  return customers.flatMap(c =>
    (c.orders || []).map(o => ({ ...o, _cname: c.name, _cphone: c.phone, _cid: c.id }))
  );
}

// ─────────────────────────────────────────
// WHATSAPP MESSAGE BUILDERS
// ─────────────────────────────────────────
export function waLink(phone, msg) {
  const p = (phone || "").replace(/\D/g, "");
  const num = p.startsWith("0") ? "234" + p.slice(1) : p.startsWith("234") ? p : "234" + p;
  return `https://wa.me/${num}?text=${encodeURIComponent(msg)}`;
}

export function buildReceiptText(order, customer, shopName, vaDetails = null) {
  const paid = getTotalPaid(order);
  const bal  = getBalance(order);
  const va   = vaDetails; // { number, bank, name }
  return [
    `━━━━━━━━━━━━━━━━━━━━━`,
    `🧵 *${shopName}*`,
    `━━━━━━━━━━━━━━━━━━━━━`,
    `Hi *${customer.name}*! Just confirmed your order 🙏`,
    ``,
    `Item: ${order.type || "Order"}`,
    `Delivery: ${fmtDate(order.date || order.delivery_date)}`,
    ``,
    `Total Price:  *${fmt(order.price)}*`,
    `Amount Paid:  ${fmt(paid)}`,
    `Balance Due:  *${fmt(bal)}*`,
    ``,
    `Status: ${orderStatus(order)}`,
    order.notes ? `Notes: ${order.notes}` : "",
    ``,
    ...(bal > 0 && va ? [
      `━━━━━━━━━━━━━━━━━━━━━`,
      `🏦 *To pay your balance, transfer to:*`,
      `Bank: *${va.bank}*`,
      `Account: *${va.number}*`,
      `Name: *${va.name}*`,
      `Amount: *${fmt(bal)}*`,
      `It reflects immediately! 🙏`,
    ] : bal <= 0 ? [`✅ Order is fully paid! Thank you so much 🙏`] : []),
    `━━━━━━━━━━━━━━━━━━━━━`,
    `_Powered by BOSS — Build Trust. Grow Faster._`,
    `━━━━━━━━━━━━━━━━━━━━━`,
  ].filter(l => l !== undefined && l !== "").join("\n");
}

export function buildInvoiceMsg(order, customer, shopName, vaDetails = null) {
  const bal  = getBalance(order);
  const va   = vaDetails;
  return [
    `Hello *${customer.name}*! 👋`,
    ``,
    `Here is your order summary from *${shopName}*:`,
    ``,
    `📋 Item: ${order.type || "Order"}`,
    `💰 Total: *${fmt(order.price)}*`,
    `✅ Paid: ${fmt(getTotalPaid(order))}`,
    `🔴 Balance: *${fmt(bal)}*`,
    ``,
    ...(bal > 0 && va ? [
      `To pay, please transfer *${fmt(bal)}* to:`,
      ``,
      `🏦 Bank: *${va.bank}*`,
      `📋 Account: *${va.number}*`,
      `👤 Name: *${va.name}*`,
      ``,
      `It reflects immediately! Let us know once you've sent it 🙏`,
    ] : bal <= 0 ? [`Your order is *fully paid*! Thank you so much 🙏`] : [`Please contact us to arrange payment.`]),
    ``,
    `_${shopName} · Powered by BOSS_`,
  ].filter(l => l !== undefined).join("\n");
}

export function buildReminderMsg(order, customer, shopName, vaDetails = null) {
  const bal  = getBalance(order);
  const va   = vaDetails;
  return [
    `Hi *${customer.name}*! Just checking in from *${shopName}* 😊`,
    ``,
    `Your *${order.type || "order"}* has a balance of *${fmt(bal)}* outstanding.`,
    ``,
    ...(va ? [
      `To pay, please transfer to:`,
      `🏦 Bank: *${va.bank}*`,
      `🔢 Account: *${va.number}*`,
      `👤 Name: *${va.name}*`,
      `Amount: *${fmt(bal)}*`,
      ``,
      `It reflects immediately — let us know once you've sent it! 🙏`,
    ] : [`Please come to the shop to pay. Thank you! 🙏`]),
    `_${shopName} · Powered by BOSS_`,
  ].filter(l => l !== undefined).join("\n");
}

// Keep buildInvoiceLinkMsg as a deprecated alias pointing to buildInvoiceMsg
export function buildInvoiceLinkMsg(order, customer, shopName) {
  return buildInvoiceMsg(order, customer, shopName, null);
}

// ─────────────────────────────────────────
// EARNINGS COMPUTATION
// ─────────────────────────────────────────
export function computeEarnings(customers) {
  const orders = allOrders(customers);

  const totalCollected = orders.reduce((sum, o) => sum + getTotalPaid(o), 0);

  const totalOwed = orders.reduce((sum, o) => {
    const bal = getBalance(o);
    return sum + (bal > 0 ? bal : 0);
  }, 0);

  const debtorMap = {};
  orders.forEach(o => {
    const bal = getBalance(o);
    if (bal <= 0) return;
    const cid = o._cid || o.customer_id;
    const c = (customers || []).find(x => x.id === cid);
    if (!c) return;
    if (!debtorMap[c.id]) debtorMap[c.id] = { name: c.name, owed: 0 };
    debtorMap[c.id].owed += bal;
  });
  const debtors = Object.values(debtorMap).sort((a, b) => b.owed - a.owed);

  const now = new Date();
  const thisMonth = orders
    .filter(o => {
      const ts = o.createdAt || o.created_at;
      const d = ts ? new Date(ts) : null;
      return d && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    })
    .reduce((sum, o) => sum + getTotalPaid(o), 0);

  const jobMap = {};
  orders.forEach(o => {
    if (!o.type || !(o.price > 0)) return;
    if (!jobMap[o.type]) jobMap[o.type] = { total: 0, count: 0 };
    jobMap[o.type].total += o.price;
    jobMap[o.type].count += 1;
  });
  const jobRanking = Object.entries(jobMap)
    .map(([type, { total, count }]) => ({ type, avg: Math.round(total / count), count }))
    .sort((a, b) => b.avg - a.avg);

  return {
    totalCollected,
    totalOwed,
    debtors,
    thisMonth,
    bestJob:     jobRanking[0] || null,
    worstJob:    jobRanking[jobRanking.length - 1] || null,
    totalOrders: orders.length,
    paidOrders:  orders.filter(o => getBalance(o) <= 0 && getTotalPaid(o) > 0).length,
  };
}

// ─────────────────────────────────────────
// TRUST SCORE ENGINE
// ─────────────────────────────────────────
export function computeTrustScore(customers) {
  const orders = allOrders(customers);
  if (!orders.length) return { score: 0, level: "New", readiness: "Low", breakdown: {} };

  const total         = orders.length;
  const delivered     = orders.filter(o => orderStatus(o) === "Delivered").length;
  const completionRate = total > 0 ? delivered / total : 0;

  // PARTIAL-02: correct formula — fraction of customers who placed >1 order.
  // Old: repeatCustomers/customers.length (wrong — penalises tailors with many
  // single-order clients even if a good share are repeat buyers).
  // New: repeatCustomers / customersWhoHaveOrders (correct denominator).
  const ordersByCustomer = {};
  customers.forEach(c => { if ((c.orders || []).length > 0) ordersByCustomer[c.id] = (c.orders || []).length; });
  const custWithOrders  = Object.keys(ordersByCustomer).length;
  const repeatCustomers = Object.values(ordersByCustomer).filter(n => n > 1).length;
  const repeatRate      = custWithOrders > 0 ? repeatCustomers / custWithOrders : 0;

  const paidOrders  = orders.filter(o => getBalance(o) === 0 && orderStatus(o) === "Delivered");
  const paymentRate = delivered > 0 ? paidOrders.length / delivered : 0;

  const revenue      = orders.reduce((s, o) => s + getTotalPaid(o), 0);
  const avgOrder     = total > 0 ? revenue / total : 0;
  const revenueScore = Math.min(1, avgOrder / 50000);

  const overdue        = orders.filter(o => isOverdue(o)).length;
  const disputePenalty = Math.min(0.3, overdue * 0.05);

  const raw   = (completionRate * 30 + repeatRate * 25 + paymentRate * 25 + revenueScore * 20) - (disputePenalty * 100);
  const score = Math.max(0, Math.min(100, Math.round(raw)));
  const level = score >= 75 ? "Trusted" : score >= 50 ? "Growing" : score >= 25 ? "Building" : "New";
  const readiness = score >= 70 ? "High" : score >= 45 ? "Medium" : "Low";

  return {
    score, level, readiness,
    breakdown: {
      completion:  Math.round(completionRate * 100),
      repeatRate:  Math.round(repeatRate * 100),
      paymentRate: Math.round(paymentRate * 100),
      revenue,
      overdue,
    },
  };
}
