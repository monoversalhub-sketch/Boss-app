"use client";
import { useState, useRef, useCallback } from "react";
import { C } from "./tokens";

const slides = [
  {
    emoji: "✂️",
    headline: "Add an order in 15 seconds",
    body: "Tap the + button, type your customer's name, set the price and delivery date. Done.\nBOSS remembers everything so you don't have to.",
  },
  {
    emoji: "💰",
    headline: "Always know who owes you",
    body: "Every deposit and payment you record is tracked automatically. Open the Earnings tab anytime to see exactly what you've collected and what's still outstanding.",
  },
  {
    emoji: "📲",
    headline: "Send receipts on WhatsApp",
    body: "After collecting a payment, send your customer a professional receipt in one tap — straight from WhatsApp. No typing. No printing.\nThey'll know you mean serious business.",
  },
];

export function OnboardingTour({ open, onClose }) {
  const [slide, setSlide] = useState(0);
  const touchStart = useRef(null);
  const containerRef = useRef(null);

  const handleTouchStart = useCallback((e) => {
    touchStart.current = e.touches[0].clientX;
  }, []);

  const handleTouchEnd = useCallback((e) => {
    if (!touchStart.current) return;
    const diff = touchStart.current - e.changedTouches[0].clientX;
    if (diff > 50 && slide < slides.length - 1) setSlide(s => s + 1);
    if (diff < -50 && slide > 0) setSlide(s => s - 1);
    touchStart.current = null;
  }, [slide]);

  if (!open) return null;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 400, backgroundColor: C.bg, overflowY: "auto" }}>
      <div style={{ padding: "20px 20px 0", display: "flex", justifyContent: "flex-end" }}>
        <button onClick={onClose}
          style={{ width: 36, height: 36, borderRadius: 18, background: C.s3, border: "none", fontSize: 16, cursor: "pointer", color: C.text, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "inherit" }}>
          ✕
        </button>
      </div>
      <div ref={containerRef}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 24px 60px", overflow: "hidden" }}>
        <div style={{ width: "100%", maxWidth: 340, display: "flex", transition: "transform 0.25s ease", transform: `translateX(-${slide * 100}%)` }}>
          {slides.map((s, i) => (
            <div key={i} style={{ width: "100%", flexShrink: 0, textAlign: "center" }}>
              <div style={{ fontSize: 72, marginBottom: 16 }}>{s.emoji}</div>
              <div style={{ fontSize: 22, fontWeight: 900, color: C.text, lineHeight: 1.3, marginBottom: 12 }}>
                {s.headline}
              </div>
              <div style={{ fontSize: 14, color: C.sub, lineHeight: 1.7, whiteSpace: "pre-line" }}>
                {s.body}
              </div>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 6, marginTop: 32, alignItems: "center" }}>
          {slides.map((_, i) => (
            <div key={i} onClick={() => setSlide(i)}
              style={{ width: i === slide ? 20 : 6, height: 6, borderRadius: 3, backgroundColor: i === slide ? C.accent : C.s4, cursor: "pointer", transition: "all 0.2s" }} />
          ))}
        </div>
        <button onClick={() => {
          if (slide < slides.length - 1) setSlide(s => s + 1);
          else onClose();
        }}
          style={{ marginTop: 32, padding: "14px 32px", borderRadius: 14, backgroundColor: C.text, color: "#fff", fontSize: 16, fontWeight: 800, border: "none", cursor: "pointer", fontFamily: "inherit" }}>
          {slide < slides.length - 1 ? "Next →" : "Done"}
        </button>
      </div>
    </div>
  );
}
