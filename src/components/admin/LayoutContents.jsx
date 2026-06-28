"use client";
import { useState, useEffect } from "react";
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
  { label: "Onboarding", path: "/admin/onboarding", icon: "🚀" },
  { label: "Product Intelligence", path: "/admin/product-intelligence", icon: "📊" },
  { label: "Support Center", path: "/admin/support", icon: "🎧" },
  { label: "Feature Requests", path: "/admin/feature-requests", icon: "💡" },
  { label: "Bug Center", path: "/admin/bug-center", icon: "🐛" },
  { label: "Fraud & Risk", path: "/admin/fraud-risk", icon: "🛡️" },
  { label: "Experiments", path: "/admin/experiments", icon: "🧪" },
  { label: "Settings", path: "/admin/settings", icon: "⚙️" },
];

function Sidebar({ collapsed, mobile, open, onToggle, onNav }) {
  const pathname = usePathname();

  const linkStyle = (active) => ({
    display: "flex", alignItems: "center", gap: 10,
    padding: "8px 14px", borderRadius: 8,
    fontSize: 13, fontWeight: active ? 700 : 500,
    color: active ? "#fff" : C.sub,
    backgroundColor: active ? "rgba(255,255,255,0.08)" : "transparent",
    textDecoration: "none", cursor: "pointer",
    transition: "all 0.12s", minHeight: 40,
  });

  const sidebar = (
    <div style={{
      width: collapsed && !mobile ? 64 : 240,
      height: "100%",
      backgroundColor: C.s1,
      borderRight: mobile ? "none" : `1px solid ${C.border}`,
      display: "flex", flexDirection: "column",
      transition: "width 0.2s", overflow: "hidden",
    }}>
      <div style={{
        padding: "16px 14px", borderBottom: `1px solid ${C.border}`,
        display: "flex", alignItems: "center", gap: 10, minHeight: 56,
      }}>
        {(!collapsed || mobile) && (
          <div style={{ fontSize: 18, fontWeight: 900, color: C.text, letterSpacing: "-0.5px", whiteSpace: "nowrap" }}>
            BOSS<span style={{ color: C.accent }}> Admin</span>
          </div>
        )}
        {collapsed && !mobile && <div style={{ fontSize: 20, fontWeight: 900, color: C.accent }}>B</div>}
        {mobile && (
          <div onClick={onToggle} style={{ marginLeft: "auto", fontSize: 20, cursor: "pointer", color: C.sub }} className="tap">✕</div>
        )}
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: 8 }}>
        {NAV_ITEMS.map(item => {
          const active = pathname === item.path || (item.path !== "/admin" && pathname.startsWith(item.path));
          return (
            <div
              key={item.path}
              onClick={() => { onNav?.(item.path); }}
              style={linkStyle(active)}
              className="tap"
              title={collapsed && !mobile ? item.label : undefined}
            >
              <span style={{ fontSize: 16, flexShrink: 0 }}>{item.icon}</span>
              {(!collapsed || mobile) && <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.label}</span>}
            </div>
          );
        })}
      </div>
      {!mobile && (
        <div style={{ padding: 8, borderTop: `1px solid ${C.border}` }}>
          <div
            onClick={onToggle}
            style={{ ...linkStyle(false), justifyContent: "center", fontSize: 14, minHeight: 36 }}
            className="tap"
          >
            {collapsed ? "→" : "← Collapse"}
          </div>
        </div>
      )}
    </div>
  );

  if (!mobile) return sidebar;

  return (
    <>
      {open && (
        <div
          onClick={() => onToggle()}
          style={{ position: "fixed", inset: 0, zIndex: 998, backgroundColor: "rgba(0,0,0,0.6)" }}
        />
      )}
      <div style={{
        position: "fixed", top: 0, left: 0, bottom: 0, zIndex: 999,
        transform: open ? "translateX(0)" : "translateX(-100%)",
        transition: "transform 0.25s cubic-bezier(0.32,0.72,0,1)",
        boxShadow: open ? "4px 0 24px rgba(0,0,0,0.4)" : "none",
      }}>
        {sidebar}
      </div>
    </>
  );
}

export default function LayoutContents({ children, admin }) {
  const [collapsed, setCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    setIsMobile(mq.matches);
    const handler = (e) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [isMobile]);

  const mainPad = isMobile ? "16px 12px 80px" : "28px 32px 48px";

  return (
    <div id="boss-admin" style={{
      display: "flex", height: "100dvh", width: "100vw",
      backgroundColor: C.bg, color: C.text, fontFamily: "var(--font-plus-jakarta),sans-serif",
      overflow: "hidden",
    }}>
      <Sidebar
        collapsed={collapsed}
        mobile={isMobile}
        open={mobileOpen}
        onToggle={() => setMobileOpen(v => !v)}
        onNav={(path) => { setMobileOpen(false); router.push(path); }}
      />
      <main style={{
        flex: 1, overflowY: "auto", padding: mainPad, minWidth: 0,
      }}>
        {isMobile && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, minHeight: 40 }}>
            <div
              onClick={() => setMobileOpen(true)}
              style={{ fontSize: 22, cursor: "pointer", color: C.text, lineHeight: 1 }} className="tap"
            >
              ☰
            </div>
            <div style={{ fontSize: 16, fontWeight: 800, color: C.text }}>
              BOSS <span style={{ color: C.accent }}>Admin</span>
            </div>
          </div>
        )}
        {children}
      </main>
      <style>{`
        .tap{transition:transform 0.08s,opacity 0.08s;cursor:pointer}
        .tap:active{transform:scale(0.97);opacity:0.8}
        @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
        @keyframes pulse{0%,100%{opacity:0.5}50%{opacity:1}}
        #boss-admin,#boss-admin *{max-width:none!important}
        html:has(#boss-admin),html:has(#boss-admin) body{max-width:none!important;overflow:auto!important}
      `}</style>
    </div>
  );
}
