"use client";
import { useState, useEffect, useCallback } from "react";
import { AdminC as C, AdminS as S, SectionHeader, AdminTable, MetricsRow, MetricCard } from "@/components/admin/Layout";
import { MEAS_FIELDS } from "@/components/boss/tokens";

export default function MeasurementsPage() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { getBrowserClient } = await import("@/lib/db");
    const client = await getBrowserClient();
    const [{ data: customersData }, { data: tailors }] = await Promise.all([
      client.from("customers").select("*").order("created_at", { ascending: false }),
      client.from("tailors").select("id, name"),
    ]);
    const tailorMap = {};
    tailors?.forEach(t => { tailorMap[t.id] = t.name; });

    const withMeas = (customersData || []).filter(c => c.measurements && Object.keys(c.measurements).length > 0);
    const totalMeas = withMeas.reduce((s, c) => s + Object.keys(c.measurements).length, 0);
    const measFieldsPopulated = {};
    withMeas.forEach(c => {
      Object.keys(c.measurements).forEach(k => { measFieldsPopulated[k] = (measFieldsPopulated[k] || 0) + 1; });
    });

    setCustomers({
      all: customersData || [],
      withMeasurements: withMeas,
      totalCustomers: customersData?.length || 0,
      totalWithMeasurements: withMeas.length,
      totalMeasurements: totalMeas,
      measFieldsPopulated,
      tailorMap,
    });
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const data = customers;

  return (
    <div>
      <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: "-0.5px", marginBottom: 24 }}>
        Measurements Intelligence
      </div>
      <div style={{ fontSize: 13, color: C.sub, marginBottom: 20, lineHeight: 1.5 }}>
        Measurements are a core BOSS moat — structured measurement data enables reuse, consistency, and
        a defensible data network effect as tailors build reusable customer measurement profiles.
      </div>

      <MetricsRow>
        <MetricCard label="Customers with Meas" value={data?.totalWithMeasurements || 0} color={C.accent} />
        <MetricCard label="Total Measurements" value={data?.totalMeasurements || 0} />
        <MetricCard label="Measurement Rate" value={data?.totalCustomers
          ? `${Math.round((data.totalWithMeasurements / data.totalCustomers) * 100)}%`
          : "0%"
        } color={C.green} />
        <MetricCard label="Total Customers" value={data?.totalCustomers || 0} />
      </MetricsRow>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 24 }}>
        <div style={S.card}>
          <SectionHeader title="Field Population" action={
            <span style={{fontSize:11, color:C.sub}}>{MEAS_FIELDS.length} fields</span>
          } />
          {MEAS_FIELDS.map(f => {
            const count = data?.measFieldsPopulated?.[f.k] || 0;
            const pct = data?.totalWithMeasurements
              ? Math.round((count / data.totalWithMeasurements) * 100) : 0;
            return (
              <div key={f.k} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: C.sub, minWidth: 60 }}>{f.l}</div>
                <div style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: C.s3, overflow: "hidden" }}>
                  <div style={{
                    width: `${pct}%`, height: "100%", borderRadius: 3,
                    backgroundColor: C.accent, transition: "width 0.6s",
                  }} />
                </div>
                <div style={{ fontSize: 11, fontWeight: 600, color: C.text, minWidth: 24, textAlign: "right" }}>{count}</div>
              </div>
            );
          })}
        </div>

        <div style={S.card}>
          <SectionHeader title="Measurement Reuse Opportunity" />
          <div style={{ fontSize: 13, color: C.sub, lineHeight: 1.7 }}>
            <div style={{ marginBottom: 12 }}>
              <strong style={{ color: C.text }}>{data?.totalWithMeasurements || 0}</strong> customers have saved measurements
            </div>
            <div style={{ marginBottom: 12 }}>
              <strong style={{ color: C.text }}>Reuse rate</strong> — customers with measurements who order again
              can skip re-measurement, saving time and ensuring consistency.
            </div>
            <div style={{ marginBottom: 12 }}>
              <strong style={{ color: C.text }}>Network moat</strong> — as more tailors use structured measurements,
              BOSS becomes the definitive measurement standard for African fashion.
            </div>
            <div>
              <strong style={{ color: C.text }}>Future:</strong> Measurement templates, size recommendations,
              cross-tailor portability with consent.
            </div>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 24 }}>
        <SectionHeader title="Customers with Measurements" action={
          <span style={{ fontSize: 11, color: C.sub }}>{data?.withMeasurements?.length || 0} customers</span>
        } />
        <AdminTable
          columns={[
            { key: "tailorName", label: "Tailor", render: (_, r) => data?.tailorMap?.[r.tailor_id] || "—" },
            { key: "name", label: "Customer" },
            { key: "measCount", label: "Meas Fields", render: (_, r) => Object.keys(r.measurements || {}).length },
            { key: "measReuse", label: "Reusable", render: (_, r) =>
              Object.keys(r.measurements || {}).length >= 3
                ? <span style={{color: C.green}}>✓</span>
                : <span style={{color: C.amber}}>Partial</span>
            },
          ]}
          rows={data?.withMeasurements || []}
        />
      </div>
    </div>
  );
}
