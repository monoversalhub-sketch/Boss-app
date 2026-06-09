"use client";
import { AdminC as C, AdminS as S, SectionHeader, MetricsRow, MetricCard, StatusBadge } from "@/components/admin/Layout";

export default function FraudRiskPage() {
  return (
    <div>
      <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: "-0.5px", marginBottom: 24 }}>
        Fraud & Risk
      </div>
      <MetricsRow>
        <MetricCard label="Flagged Activities" value={0} color={C.green} subtitle="No suspicious activity detected" />
        <MetricCard label="Disputed Orders" value={0} />
        <MetricCard label="Account Warnings" value={0} />
      </MetricsRow>
      <div style={{ ...S.card, marginTop: 24 }}>
        <SectionHeader title="Risk Monitoring" />
        <div style={{ fontSize: 13, color: C.sub, lineHeight: 1.7 }}>
          <div style={{ marginBottom: 12 }}>
            <strong style={{ color: C.text }}>Automated detection rules</strong> (coming soon):
          </div>
          <div>• Unusual spikes in order velocity</div>
          <div>• Payment anomalies (large unpaid balances)</div>
          <div>• Duplicate account detection</div>
          <div>• Abnormal measurement patterns</div>
          <div>• Rapid Trust Score manipulation attempts</div>
          <div style={{ marginTop: 12 }}>
            <strong style={{ color: C.text }}>Manual review queue</strong> — flagged items requiring human review.
          </div>
          <div style={{ marginTop: 8, color: C.muted }}>
            No items currently flagged. All clear.
          </div>
        </div>
      </div>
    </div>
  );
}
