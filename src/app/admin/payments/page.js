"use client";
import { useState, useEffect, useCallback } from "react";
import { AdminC as C, AdminS as S, SectionHeader, AdminTable, MetricsRow, MetricCard, ScoreBar } from "@/components/admin/Layout";
import { computeCreditReadiness } from "@/lib/admin/credit";
import { creditReadiness } from "@/lib/admin/credit";

export default function PaymentsPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { getBrowserClient } = await import("@/lib/db");
    const client = await getBrowserClient();
    const [{ data: ordersData }, { data: tailors }] = await Promise.all([
      client.from("orders").select("*").order("created_at", { ascending: false }).limit(200),
      client.from("tailors").select("id, name"),
    ]);
    const tailorMap = {};
    tailors?.forEach(t => { tailorMap[t.id] = t.name; });
    setOrders((ordersData || []).map(o => ({
      ...o,
      tailorName: tailorMap[o.tailor_id] || "—",
      balance: (parseFloat(o.price) || 0) - (parseFloat(o.deposit) || 0) - (parseFloat(o.paid) || 0),
      fullyPaid: ((parseFloat(o.price) || 0) - (parseFloat(o.deposit) || 0) - (parseFloat(o.paid) || 0)) <= 0,
    })));
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const totalRevenue = orders.reduce((s, o) => s + (parseFloat(o.deposit) || 0) + (parseFloat(o.paid) || 0), 0);
  const totalOutstanding = orders.reduce((s, o) => s + Math.max(0, (parseFloat(o.price) || 0) - (parseFloat(o.deposit) || 0) - (parseFloat(o.paid) || 0)), 0);
  const fullyPaid = orders.filter(o => o.fullyPaid).length;
  const delivered = orders.filter(o => o.status === "Delivered").length;
  const collectionRate = delivered > 0 ? Math.round((fullyPaid / delivered) * 100) : 0;

  return (
    <div>
      <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: "-0.5px", marginBottom: 24 }}>
        Payment Intelligence
      </div>

      <MetricsRow>
        <MetricCard label="Total Revenue" value={`₦${totalRevenue.toLocaleString("en-NG")}`} color={C.green} />
        <MetricCard label="Outstanding" value={`₦${totalOutstanding.toLocaleString("en-NG")}`} color={C.red} />
        <MetricCard label="Collection Rate" value={`${collectionRate}%`}
          color={collectionRate >= 70 ? C.green : collectionRate >= 40 ? C.amber : C.red} />
        <MetricCard label="Fully Paid Orders" value={fullyPaid} />
        <MetricCard label="Delivered Orders" value={delivered} />
      </MetricsRow>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 24 }}>
        <div style={S.card}>
          <SectionHeader title="Payment Health Summary" />
          <div style={{ fontSize: 13, color: C.sub, lineHeight: 1.8 }}>
            <div><strong style={{color: C.text}}>Collection Rate:</strong> {collectionRate}% of delivered orders paid in full</div>
            <div><strong style={{color: C.text}}>Avg Order Value:</strong> ₦{orders.length ? Math.round(totalRevenue / orders.length).toLocaleString("en-NG") : 0}</div>
            <div><strong style={{color: C.text}}>Outstanding Ratio:</strong> {totalRevenue > 0 ? Math.round((totalOutstanding / totalRevenue) * 100) : 0}% of revenue uncollected</div>
            <div><strong style={{color: C.text}}>Payment Consistency:</strong> Foundation for future credit scoring</div>
          </div>
        </div>

        <div style={S.card}>
          <SectionHeader title="Credit Readiness Infrastructure" />
          <div style={{ fontSize: 13, color: C.sub, lineHeight: 1.7 }}>
            <div style={{marginBottom: 8}}>Data being collected for future lending:</div>
            <div>• Trust Score history per business</div>
            <div>• Payment consistency over time</div>
            <div>• Delivery reliability rates</div>
            <div>• Customer retention rates</div>
            <div>• Monthly revenue averages &amp; volatility</div>
            <div>• Months of transaction history</div>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 24 }}>
        <SectionHeader title="Orders — Payment Status" />
        <AdminTable
          columns={[
            { key: "tailorName", label: "Business" },
            { key: "cloth_type", label: "Item" },
            { key: "price", label: "Price", align: "right", render: (v) => v ? `₦${parseFloat(v).toLocaleString("en-NG")}` : "—" },
            { key: "deposit", label: "Deposit", align: "right", render: (v) => v ? `₦${parseFloat(v).toLocaleString("en-NG")}` : "—" },
            { key: "paid", label: "Paid", align: "right", render: (v) => v ? `₦${parseFloat(v).toLocaleString("en-NG")}` : "—" },
            { key: "balance", label: "Balance", align: "right", render: (v) =>
              <span style={{color: v > 0 ? C.red : C.green, fontWeight: 700}}>
                {v > 0 ? `₦${v.toLocaleString("en-NG")}` : "✓ Paid"}
              </span>
            },
            { key: "status", label: "Status", render: (v) => v === "Delivered" ?
              <span style={{color: C.green}}>Delivered</span> :
              <span style={{color: C.amber}}>{v}</span>
            },
          ]}
          rows={orders}
        />
      </div>
    </div>
  );
}
