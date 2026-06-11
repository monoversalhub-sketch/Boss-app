"use client";
import { useEffect } from "react";

export default function LandingStyles() {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add("is-visible");
          observer.unobserve(e.target);
        }
      }),
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    document.querySelectorAll(".reveal").forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <style>{`
      @keyframes fadeUp {
        from { opacity: 0; transform: translateY(20px); }
        to   { opacity: 1; transform: translateY(0);     }
      }
      @keyframes cardFloat {
        0%, 100% { transform: translateY(0px);  }
        50%       { transform: translateY(-7px); }
      }
      @keyframes cursorBlink {
        0%, 100% { opacity: 1; }
        50%       { opacity: 0; }
      }
      @keyframes progressBar {
        from { width: 0%;   }
        to   { width: 100%; }
      }
      .reveal {
        opacity: 0;
        transform: translateY(20px);
        transition: opacity 0.45s ease, transform 0.45s ease;
      }
      .reveal.is-visible { opacity: 1; transform: translateY(0); }
      .stagger > *:nth-child(1) { transition-delay: 0.00s; }
      .stagger > *:nth-child(2) { transition-delay: 0.07s; }
      .stagger > *:nth-child(3) { transition-delay: 0.14s; }
      .stagger > *:nth-child(4) { transition-delay: 0.21s; }
      .stagger > *:nth-child(5) { transition-delay: 0.28s; }
      .tap-target {
        cursor: pointer;
        transition: transform 0.1s ease, opacity 0.1s ease;
        -webkit-tap-highlight-color: transparent;
      }
      .tap-target:active { transform: scale(0.97); opacity: 0.85; }
      .scroll-x { scrollbar-width: none; -ms-overflow-style: none; }
      .scroll-x::-webkit-scrollbar { display: none; }
      .cursor::after {
        content: "|";
        animation: cursorBlink 1s infinite;
        color: #0066CC;
        font-weight: 300;
      }
      @media (max-width: 390px) {
        .hero-headline { font-size: 38px !important; letter-spacing: -1.5px !important; }
        .section-headline { font-size: 24px !important; }
        .body-large { font-size: 16px !important; }
      }
      @media (min-width: 768px) {
        .pain-grid { display: grid !important; grid-template-columns: 1fr 1fr; gap: 14px; }
        .pillar-grid { display: grid !important; grid-template-columns: 1fr 1fr 1fr; gap: 20px; }
        .storage-grid { display: flex !important; justify-content: center; gap: 12px; }
        .stats-row { display: flex !important; justify-content: center; gap: 60px; }
        .before-after { display: grid !important; grid-template-columns: 1fr 1fr; gap: 16px; }
      }
    `}</style>
  );
}
