"use client";

const C = {
  bg: "#0A0A0B", s1: "#141416", s2: "#1C1C1E", s3: "#2C2C2E",
  border: "#38383A", text: "#F5F5F7", sub: "#8E8E93", muted: "#636366",
  accent: "#0066CC", green: "#30D158", amber: "#FF9F0A", red: "#FF453A",
};

export { C as AdminC };

const S = {
  card: {
    backgroundColor: C.s1, borderRadius: 14, padding: 20,
    border: `1px solid ${C.border}`,
  },
  stat: {
    fontSize: 28, fontWeight: 800, color: C.text, letterSpacing: "-0.5px", lineHeight: 1.1,
  },
  label: {
    fontSize: 12, fontWeight: 600, color: C.sub, letterSpacing: "0.3px", textTransform: "uppercase",
  },
};

export { S as AdminS };

export function MetricsRow({ children }) {
  return (
    <div style={{
      display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
      gap: 12,
    }}>
      {children}
    </div>
  );
}

export function MetricCard({ label, value, sub, trend, color, subtitle }) {
  return (
    <div style={{ ...S.card }}>
      <div style={S.label}>{label}</div>
      <div style={{ ...S.stat, color: color || C.text, marginTop: 4 }}>{value}</div>
      {(sub || subtitle) && <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>{sub || subtitle}</div>}
      {trend !== undefined && (
        <div style={{ fontSize: 11, fontWeight: 700, marginTop: 4, color: trend >= 0 ? C.green : C.red }}>
          {trend >= 0 ? "↑" : "↓"} {Math.abs(trend)}%
        </div>
      )}
    </div>
  );
}

export function AdminTable({ columns, rows, onRowClick }) {
  const tableS = {
    width: "100%", borderCollapse: "collapse", fontSize: 13,
  };
  const thS = {
    textAlign: "left", padding: "10px 12px",
    color: C.sub, fontWeight: 600, fontSize: 11,
    textTransform: "uppercase", letterSpacing: "0.5px",
    borderBottom: `1px solid ${C.border}`,
  };
  const tdS = {
    padding: "10px 12px", borderBottom: `1px solid ${C.border}`, color: C.text,
  };

  return (
    <div style={{ ...S.card, padding: 0, overflow: "auto" }}>
      <table style={tableS}>
        <thead>
          <tr>
            {columns.map(col => (
              <th key={col.key} style={{ ...thS, textAlign: col.align || "left", width: col.width }}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={row.id || i} onClick={() => onRowClick?.(row)}
              style={{ cursor: onRowClick ? "pointer" : "default" }}
              className={onRowClick ? "tap" : ""}>
              {columns.map(col => (
                <td key={col.key} style={{ ...tdS, textAlign: col.align || "left" }}>
                  {col.render ? col.render(row[col.key], row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
          {!rows.length && (
            <tr>
              <td colSpan={columns.length} style={{ ...tdS, textAlign: "center", color: C.muted, padding: 32 }}>
                No data
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export function SectionHeader({ title, action }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
      <div style={{ fontSize: 16, fontWeight: 700, color: C.text }}>{title}</div>
      {action}
    </div>
  );
}

export function ScoreBar({ score, height = 8, showLabel }) {
  const color = score >= 70 ? C.green : score >= 40 ? C.amber : C.red;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ flex: 1, height, borderRadius: height / 2, backgroundColor: C.s3, overflow: "hidden" }}>
        <div style={{
          width: `${Math.min(100, Math.max(0, score))}%`, height: "100%",
          borderRadius: height / 2, backgroundColor: color,
          transition: "width 0.6s ease",
        }} />
      </div>
      {showLabel && <span style={{ fontSize: 11, fontWeight: 700, color: C.sub, minWidth: 28 }}>{score}</span>}
    </div>
  );
}

export function StatusBadge({ status, level }) {
  const statuses = {
    healthy: { label: "Healthy", color: C.green },
    growing: { label: "Growing", color: C.accent },
    at_risk: { label: "At Risk", color: C.amber },
    dormant: { label: "Dormant", color: C.muted },
    low: { label: "Low", color: C.green },
    medium: { label: "Medium", color: C.amber },
    high: { label: "High", color: C.red },
    critical: { label: "Critical", color: "#FF375F" },
    open: { label: "Open", color: C.accent },
    in_progress: { label: "In Progress", color: C.amber },
    resolved: { label: "Resolved", color: C.green },
    closed: { label: "Closed", color: C.muted },
  };
  const s = statuses[status || level] || { label: status, color: C.muted };
  return <span style={{ display: "inline-flex", padding: "2px 8px", borderRadius: 6, fontSize: 11, fontWeight: 700, color: "#fff", backgroundColor: s.color }}>{s.label}</span>;
}
