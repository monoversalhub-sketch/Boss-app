"use client";
import { AdminC as C, AdminS as S, SectionHeader } from "@/components/admin/Layout";

export default function ActivityPage() {
  return (
    <div>
      <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: "-0.5px", marginBottom: 24 }}>
        Activity Log
      </div>
      <div style={S.card}>
        <SectionHeader title="Recent Platform Activity" />
        <div style={{ fontSize: 13, color: C.sub, lineHeight: 1.7 }}>
          Activity tracking will capture: user signups, order creation, payment events,
          feature usage, and admin actions. Coming in next iteration.
        </div>
      </div>
    </div>
  );
}
