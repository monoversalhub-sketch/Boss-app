"use client";
// src/components/boss/SplashScreen.jsx
import { C } from "./tokens";

export function SplashScreen() {
  return (
    <div style={{
      height: "100%", background: C.bg, display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", fontFamily: "'Plus Jakarta Sans',sans-serif",
    }}>
      <div className="anim-boss" style={{
        width: 96, height: 96, background: C.text, borderRadius: 26,
        display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: "0 16px 60px rgba(0,0,0,0.2)", fontSize: 48, fontWeight: 900, color: "#fff",
      }}>B</div>
      <div className="anim-up1" style={{
        fontSize: 34, fontWeight: 900, letterSpacing: "-1.5px", marginTop: 20, color: C.text,
      }}>BOSS</div>
      <div className="anim-up2" style={{
        fontSize: 13, color: C.sub, fontWeight: 600, letterSpacing: "2px",
        textTransform: "uppercase", marginTop: 6,
      }}>Build Trust. Grow Faster.</div>
      <div className="anim-up3" style={{
        width: 100, height: 3, background: C.s3, borderRadius: 3,
        marginTop: 60, overflow: "hidden",
      }}>
        <div className="anim-fill" style={{ height: "100%", background: C.text, borderRadius: 3 }} />
      </div>
    </div>
  );
}
