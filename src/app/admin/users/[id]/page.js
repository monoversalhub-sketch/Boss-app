"use client";
import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { AdminC as C, AdminS as S, SectionHeader, ScoreBar, MetricsRow, MetricCard, AdminTable, StatusBadge } from "@/components/admin/Layout";

export default function UserDetailPage() {
  const { id } = useParams();
  const [user, setUser] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("overview");

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ queries: [
          { key: "tailor", table: "tailors", select: "*", filters: [{ method: "eq", column: "id", value: id }], single: true },
          { key: "orders", table: "orders", select: "*", filters: [{ method: "eq", column: "tailor_id", value: id }], order: "created_at desc" },
          { key: "health", table: "business_health_scores", select: "*", filters: [{ method: "eq", column: "tailor_id", value: id }], single: true },
          { key: "churn", table: "churn_risk", select: "*", filters: [{ method: "eq", column: "tailor_id", value: id }], single: true },
          { key: "credit", table: "credit_readiness", select: "*", filters: [{ method: "eq", column: "tailor_id", value: id }], single: true },
        ]}),
      });
      const json = await res.json();
      const results = {};
      (json.results || []).forEach(r => { results[r.key] = r.data; });
      if (results.tailor) setUser({ ...results.tailor, health: results.health, churn: results.churn, credit: results.credit });
      setOrders(results.orders || []);
    } catch (err) { console.error("User load error:", err); }
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  if (loading && !user) return <div style={{color: C.sub}}>Loading user…</div>;
  if (!user) return <div style={{color: C.red}}>User not found</div>;

  const totalRevenue = orders.reduce((s, o) => s + (parseFloat(o.deposit) || 0) + (parseFloat(o.paid) || 0), 0);
  const delivered = orders.filter(o => o.status === "Delivered").length;
  const activeDays = user.created_at
    ? Math.floor((new Date() - new Date(user.created_at)) / 86400000)
    : 0;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
        <div style={{
          width: 48, height: 48, borderRadius: 12,
          backgroundColor: C.accent, display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 20, fontWeight: 900, color: "#fff", flexShrink: 0,
        }}>
          {user.shop?.charAt(0) || "?"}
        </div>
        <div>
          <div style={{ fontSize: 24, fontWeight: 900, letterSpacing: "-0.3px" }}>{user.shop || "Unnamed"}</div>
          <div style={{ fontSize: 13, color: C.sub }}>{user.phone || "No phone"}</div>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
          <ScoreBar score={user.bos_score || 0} showLabel height={8} />
          {user.health?.category && <StatusBadge status={user.health.category} />}
          {user.churn?.risk_level && <StatusBadge status={user.churn.risk_level} />}
        </div>
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 20 }}>
        {["overview", "orders", "health", "credit"].map(t => (
          <div key={t} onClick={() => setTab(t)}
            style={{
              padding: "6px 16px", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer",
              minHeight: 32, display: "flex", alignItems: "center",
              backgroundColor: tab === t ? C.accent : C.s2, color: tab === t ? "#fff" : C.sub,
              transition: "all 0.12s",
            }} className="tap"
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </div>
        ))}
      </div>

      {tab === "overview" && (
        <>
          <MetricsRow>
            <MetricCard label="Trust Score" value={user.bos_score || 0}
              color={(user.bos_score || 0) >= 60 ? C.green : C.amber} />
            <MetricCard label="Total Orders" value={orders.length} />
            <MetricCard label="Revenue" value={`₦${totalRevenue.toLocaleString("en-NG")}`} color={C.green} />
            <MetricCard label="Delivered" value={delivered} />
            <MetricCard label="Active Days" value={activeDays} />
          </MetricsRow>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 24 }}>
            <div style={S.card}>
              <SectionHeader title="Account Info" />
              <div style={{ fontSize: 13, color: C.sub, lineHeight: 1.8 }}>
                <div>Joined: <strong style={{color: C.text}}>{user.created_at ? new Date(user.created_at).toLocaleDateString() : "—"}</strong></div>
                <div>Last active: <strong style={{color: C.text}}>{user.last_active_at ? new Date(user.last_active_at).toLocaleDateString() : "Never"}</strong></div>
                <div>Score updated: <strong style={{color: C.text}}>{user.bos_score_updated_at ? new Date(user.bos_score_updated_at).toLocaleDateString() : "Never"}</strong></div>
              </div>
            </div>
            <div style={S.card}>
              <SectionHeader title="Business Health" />
              <div style={{ fontSize: 13, color: C.sub, lineHeight: 1.8 }}>
                <div>Category: <strong style={{color: C.text}}>{user.health?.category || "Not computed"}</strong></div>
                <div>Health Score: <strong style={{color: C.text}}>{user.health?.score || "—"}</strong></div>
                <div>Churn Risk: <strong style={{color: C.text}}>{user.churn?.risk_level || "Not computed"}</strong></div>
                <div>Intervention: <strong style={{color: C.text}}>{user.churn?.intervention_recommended || "None"}</strong></div>
              </div>
            </div>
          </div>
        </>
      )}

      {tab === "orders" && (
        <AdminTable
          columns={[
            { key: "cloth_type", label: "Item" },
            { key: "price", label: "Price", align: "right", render: (v) => v ? `₦${parseFloat(v).toLocaleString("en-NG")}` : "—" },
            { key: "status", label: "Status", render: (v) => <StatusBadge status={v ? v.toLowerCase().replace(/ /g,"_") : "unknown"} /> },
            { key: "delivery_date", label: "Delivery", render: (v) => v ? new Date(v).toLocaleDateString() : "—" },
            { key: "created_at", label: "Created", render: (v) => v ? new Date(v).toLocaleDateString() : "—" },
          ]}
          rows={orders}
        />
      )}

      {tab === "health" && (
        <div style={S.card}>
          <SectionHeader title="Health Score Breakdown" />
          <div style={{ fontSize: 13, color: C.sub, lineHeight: 1.8 }}>
            <div>Order Activity: <strong style={{color: C.text}}>{user.health?.order_activity_score || 0}/100</strong></div>
            <div>Payment Activity: <strong style={{color: C.text}}>{user.health?.payment_activity_score || 0}/100</strong></div>
            <div>Customer Retention: <strong style={{color: C.text}}>{user.health?.customer_retention_score || 0}/100</strong></div>
            <div>Overdue Penalty: <strong style={{color: C.red}}>-{user.health?.overdue_jobs_penalty || 0}</strong></div>
            <div>App Usage: <strong style={{color: C.text}}>{user.health?.app_usage_score || 0}/100</strong></div>
            <div>Computed: <strong style={{color: C.text}}>{user.health?.computed_at ? new Date(user.health.computed_at).toLocaleString() : "—"}</strong></div>
          </div>
        </div>
      )}

      {tab === "credit" && (
        <div style={S.card}>
          <SectionHeader title="Credit Readiness" action={
            user.credit?.credit_ready
              ? <span style={{color: C.green, fontWeight: 700, fontSize: 13}}>✓ Credit Ready</span>
              : <span style={{color: C.muted, fontSize: 13}}>Building history…</span>
          } />
          <div style={{ fontSize: 13, color: C.sub, lineHeight: 1.8 }}>
            <div>Payment Consistency: <strong style={{color: C.text}}>{user.credit?.payment_consistency || 0}%</strong></div>
            <div>Delivery Reliability: <strong style={{color: C.text}}>{user.credit?.delivery_reliability || 0}%</strong></div>
            <div>Customer Retention: <strong style={{color: C.text}}>{user.credit?.customer_retention_rate || 0}%</strong></div>
            <div>Avg Monthly Revenue: <strong style={{color: C.text}}>₦{(user.credit?.monthly_revenue_avg || 0).toLocaleString("en-NG")}</strong></div>
            <div>Revenue Volatility: <strong style={{color: C.text}}>{user.credit?.revenue_volatility || 0}%</strong></div>
            <div>Months of Data: <strong style={{color: C.text}}>{user.credit?.months_of_data || 0}</strong></div>
            <div>Est. Credit Limit: <strong style={{color: C.green}}>₦{(user.credit?.estimated_credit_limit || 0).toLocaleString("en-NG")}</strong></div>
          </div>
        </div>
      )}
    </div>
  );
}
