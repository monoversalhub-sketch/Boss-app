"use client";
import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { AdminC as C } from "./Layout";

const NAV_ITEMS = [
  { label: "Mission Control", path: "/admin", icon: "🕹️" },
  { label: "Users", path: "/admin/users", icon: "👥" },
  { label: "Businesses", path: "/admin/businesses", icon: "🏢" },
  { label: "Orders", path: "/admin/orders", icon: "📋" },
  { label: "Customers", path: "/admin/customers", icon: "👤" },
  { label: "Payments", path: "/admin/payments", icon: "💳" },
  { label: "Measurements", path: "/admin/measurements", icon: "📏" },
  { label: "Reminders", path: "/admin/reminders", icon: "🔔" },
  { label: "Trust Score", path: "/admin/trust-score", icon: "🏆" },
  { label: "Customer Success", path: "/admin/customer-success", icon: "⭐" },
  { label: "Product Intelligence", path: "/admin/product-intelligence", icon: "📊" },
  { label: "Support Center", path: "/admin/support", icon: "🎧" },
  { label: "Feature Requests", path: "/admin/feature-requests", icon: "💡" },
  { label: "Bug Center", path: "/admin/bug-center", icon: "🐛" },
  { label: "Fraud & Risk", path: "/admin/fraud-risk", icon: "🛡️" },
  { label: "Experiments", path: "/admin/experiments", icon: "🧪" },
  { label: "Settings", path: "/admin/settings", icon: "⚙️" },
];

function Sidebar({ collapsed, onToggle }) {
  const pathname = usePathname();
  const router = useRouter();

  const linkStyle = (active) => ({
    display: "flex", alignItems: "center", gap: 10,
    padding: "8px 14px", borderRadius: 8,
    fontSize: 13, fontWeight: active ? 700 : 500,
    color: active ? "#fff" : C.sub,
    backgroundColor: active ? "rgba(255,255,255,0.08)" : "transparent",
    textDecoration: "none", cursor: "pointer",
    transition: "all 0.12s", minHeight: 40,
  });

  return (
    <div style={{
      width: collapsed ? 64 : 240, height: "100vh",
      backgroundColor: C.s1, borderRight: `1px solid ${C.border}`,
      display: "flex", flexDirection: "column", flexShrink: 0,
      transition: "width 0.2s", overflow: "hidden",
      position: "sticky", top: 0,
    }}>
      <div style={{
        padding: "16px 14px", borderBottom: `1px solid ${C.border}`,
        display: "flex", alignItems: "center", gap: 10, minHeight: 56,
      }}>
        {!collapsed && (
          <div style={{ fontSize: 18, fontWeight: 900, color: C.text, letterSpacing: "-0.5px", whiteSpace: "nowrap" }}>
            BOSS<span style={{ color: C.accent }}> Admin</span>
          </div>
        )}
        {collapsed && <div style={{ fontSize: 20, fontWeight: 900, color: C.accent }}>B</div>}
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: 8 }}>
        {NAV_ITEMS.map(item => {
          const active = pathname === item.path || (item.path !== "/admin" && pathname.startsWith(item.path));
          return (
            <div
              key={item.path}
              onClick={() => router.push(item.path)}
              style={linkStyle(active)}
              className="tap"
              title={collapsed ? item.label : undefined}
            >
              <span style={{ fontSize: 16, flexShrink: 0 }}>{item.icon}</span>
              {!collapsed && <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.label}</span>}
            </div>
          );
        })}
      </div>
      <div style={{ padding: 8, borderTop: `1px solid ${C.border}` }}>
        <div
          onClick={onToggle}
          style={{ ...linkStyle(false), justifyContent: "center", fontSize: 14, minHeight: 36 }}
          className="tap"
        >
          {collapsed ? "→" : "← Collapse"}
        </div>
      </div>
    </div>
  );
}

export default function LayoutContents({ children, admin }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div style={{
      display: "flex", height: "100vh", width: "100vw",
      backgroundColor: C.bg, color: C.text, fontFamily: "var(--font-plus-jakarta),sans-serif",
      overflow: "hidden",
    }}>
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
      <main style={{
        flex: 1, overflowY: "auto", padding: "28px 32px", minWidth: 0,
      }}>
        {children}
      </main>
      <style>{`
        .tap{transition:transform 0.08s,opacity 0.08s;cursor:pointer}
        .tap:active{transform:scale(0.97);opacity:0.8}
        @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
        @keyframes pulse{0%,100%{opacity:0.5}50%{opacity:1}}
      `}</style>
    </div>
  );
}
