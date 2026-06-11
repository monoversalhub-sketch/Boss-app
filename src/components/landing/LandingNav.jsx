"use client";
import { useState, useEffect } from "react";

const style = {
  nav: {
    position: "fixed", top: 0, left: 0, right: 0,
    height: 64, zIndex: 100,
    padding: "0 24px",
    display: "flex", alignItems: "center", justifyContent: "space-between",
    transition: "background-color 0.3s ease, box-shadow 0.3s ease",
  },
  navScrolled: {
    backgroundColor: "#FFFFFF",
    boxShadow: "0 1px 0 #E5E5EA",
  },
  navTransparent: {
    backgroundColor: "transparent",
    boxShadow: "none",
  },
  logo: {
    display: "flex", alignItems: "center", gap: 10,
    textDecoration: "none",
  },
  logoBox: {
    width: 32, height: 32, borderRadius: 8,
    backgroundColor: "#0066CC",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontWeight: 900, fontSize: 16, color: "#FFFFFF",
  },
  logoTxt: (scrolled) => ({
    fontSize: 20, fontWeight: 900,
    color: scrolled ? "#111111" : "#FFFFFF",
  }),
  right: {
    display: "flex", alignItems: "center", gap: 12,
  },
  signIn: (scrolled) => ({
    fontSize: 14, fontWeight: 600, textDecoration: "none",
    color: scrolled ? "#6E6E73" : "rgba(255,255,255,0.8)",
    minHeight: 48, display: "flex", alignItems: "center", padding: "0 8px",
  }),
  startBtn: {
    backgroundColor: "#0066CC", color: "#FFFFFF",
    height: 38, padding: "0 16px", borderRadius: 12,
    fontSize: 14, fontWeight: 800, border: "none",
    cursor: "pointer", fontFamily: "inherit",
    textDecoration: "none", display: "flex", alignItems: "center",
  },
};

export default function LandingNav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  return (
    <nav style={{ ...style.nav, ...(scrolled ? style.navScrolled : style.navTransparent) }}>
      <a href="/" style={style.logo}>
        <div style={style.logoBox}>B</div>
        <span style={style.logoTxt(scrolled)}>BOSS</span>
      </a>
      <div style={style.right}>
        <a href="/app" style={style.signIn(scrolled)}>Sign In</a>
        <a href="/app" style={style.startBtn} className="tap-target">Start Free</a>
      </div>
    </nav>
  );
}
