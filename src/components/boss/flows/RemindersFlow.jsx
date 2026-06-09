"use client";
// src/components/boss/RemindersFlow.jsx
import { useState, useRef, useEffect } from "react";
import { C, S } from "../tokens";
import { allOrders, getBalance, orderStatus, buildReminderMsg, waLink, invoiceUrl, fmt } from "../helpers";
import { useBOSS } from "../context";
import { Flow, Btn, EmptyState } from "../ui";

const BAR_STYLE = (i) => ({
  width: 3, height: 4, borderRadius: 2, backgroundColor: C.accent,
  animation: "voiceWave 0.5s ease-in-out infinite",
  animationDelay: `${i * 0.08}s`,
});

function VoiceRecorder({ onRecorded }) {
  const [state, setState] = useState("idle");
  const [audioUrl, setAudioUrl] = useState(null);
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const mrRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);
  const audioRef = useRef(null);

  async function start() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mr = new MediaRecorder(stream);
      mrRef.current = mr;
      chunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        setState("done");
        const a = new Audio(url);
        a.addEventListener("loadedmetadata", () => setDuration(Math.ceil(a.duration)));
        onRecorded(blob);
        stream.getTracks().forEach(t => t.stop());
      };
      mr.start();
      setState("recording");
    } catch { setState("idle"); }
  }

  function stop() { mrRef.current?.stop(); }

  function togglePlay() {
    if (!audioRef.current) return;
    if (playing) { audioRef.current.pause(); setPlaying(false); return; }
    audioRef.current.play(); setPlaying(true);
    audioRef.current.addEventListener("ended", () => setPlaying(false), { once: true });
  }

  function reset() {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null); setState("idle"); setDuration(0); setPlaying(false);
  }

  useEffect(() => () => { streamRef.current?.getTracks().forEach(t => t.stop()); if (audioUrl) URL.revokeObjectURL(audioUrl); }, []);

  if (state === "recording") {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", borderRadius: 10, background: "rgba(255,59,48,0.08)", border: "1px solid rgba(255,59,48,0.2)" }}>
        <div style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: C.red, animation: "pulse 1s ease-in-out infinite" }} />
        <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 16 }}>
          {Array.from({ length: 5 }).map((_, i) => <div key={i} style={BAR_STYLE(i)} />)}
        </div>
        <button className="tap" onClick={stop} style={{ marginLeft: "auto", padding: "6px 14px", borderRadius: 8, backgroundColor: C.red, color: "#fff", fontWeight: 700, fontSize: 12, border: "none", cursor: "pointer", fontFamily: "inherit" }}>Stop</button>
      </div>
    );
  }

  if (state === "done") {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 10, background: C.s2 }}>
        <audio ref={audioRef} src={audioUrl} preload="metadata" style={{ display: "none" }} />
        <button className="tap" onClick={togglePlay} style={{ width: 30, height: 30, borderRadius: "50%", backgroundColor: C.accent, color: "#fff", border: "none", cursor: "pointer", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "inherit", flexShrink: 0 }}>{playing ? "⏸" : "▶️"}</button>
        <div style={{ fontSize: 12, fontWeight: 600, color: C.text }}>{duration ? `${duration}s` : "Voice note"}</div>
        <button className="tap" onClick={reset} style={{ marginLeft: "auto", background: "none", border: "none", fontSize: 14, cursor: "pointer", color: C.sub, fontFamily: "inherit", padding: 4 }}>✕</button>
      </div>
    );
  }

  return <button className="tap" onClick={start} style={{ padding: "8px 12px", borderRadius: 10, backgroundColor: C.s3, color: C.text, fontWeight: 600, fontSize: 12, border: "none", cursor: "pointer", fontFamily: "inherit", width: "100%" }}>🎤 Record & Send Voice</button>;
}

export function RemindersFlow({ open, onClose }) {
  const { customers, tailor, toast } = useBOSS();
  const shop = tailor?.shop || "BOSS Shop";
  const orders = allOrders(customers).filter(o => getBalance(o) > 0 && orderStatus(o) !== "Delivered");
  const [voiceBlobs, setVoiceBlobs] = useState({});

  function setVoiceBlob(orderId, blob) {
    setVoiceBlobs(prev => ({ ...prev, [orderId]: blob }));
  }

  function removeVoiceBlob(orderId) {
    setVoiceBlobs(prev => { const n = { ...prev }; delete n[orderId]; return n; });
  }

  function send(o) {
    const msg = buildReminderMsg(o, { name: o._cname, phone: o._cphone }, shop);
    window.open(waLink(o._cphone, msg), "_blank");
  }

  function sendVoice(o) {
    const blob = voiceBlobs[o.id];
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const msg = `🎤 Voice note from ${shop} regarding your order`;
    window.open(waLink(o._cphone, msg + " " + url), "_blank");
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    removeVoiceBlob(o.id);
  }

  function copyLink(o) {
    const url = invoiceUrl(o.id);
    if (navigator.clipboard) { navigator.clipboard.writeText(url).then(() => toast("✅ Invoice link copied!")); }
    else { toast("Link: " + url); }
  }

  return (
    <Flow open={open} onClose={onClose} title="Send Reminders">
      {orders.length === 0
        ? <EmptyState icon="🎉" title="No unpaid balances!" sub="All orders are fully paid" />
        : orders.map(o => (
          <div key={o.id} style={{ ...S.card, display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontWeight: 700, fontSize: 15 }}>{o._cname}</div>
              <div style={{ fontWeight: 800, color: C.red }}>{fmt(getBalance(o))}</div>
            </div>
            <div style={{ fontSize: 13, color: C.sub }}>{o.type || "—"} · {o._cphone || "No phone"}</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
              <a href={`tel:${o._cphone}`} className="tap" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "12px 0", borderRadius: 12, backgroundColor: C.s3, color: C.text, fontWeight: 700, fontSize: 13, textDecoration: "none", fontFamily: "inherit", minHeight: 48 }}>
                📞
              </a>
              <Btn variant="wa" onClick={() => send(o)} style={{ padding: "12px 0", fontSize: 13, textAlign: "center" }}>📲 WA</Btn>
              <Btn variant="outline" onClick={() => copyLink(o)} style={{ padding: "12px 0", fontSize: 13, textAlign: "center" }}>📋</Btn>
            </div>
            {voiceBlobs[o.id] ? (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                <button className="tap" onClick={() => sendVoice(o)} style={{ padding: "12px 0", borderRadius: 12, backgroundColor: "#25D366", color: "#fff", fontWeight: 700, fontSize: 13, border: "none", cursor: "pointer", fontFamily: "inherit", minHeight: 48 }}>
                  📤 Send Voice
                </button>
                <button className="tap" onClick={() => removeVoiceBlob(o.id)} style={{ padding: "12px 0", borderRadius: 12, backgroundColor: C.s3, color: C.text, fontWeight: 700, fontSize: 13, border: "none", cursor: "pointer", fontFamily: "inherit", minHeight: 48 }}>
                  ✕ Discard
                </button>
              </div>
            ) : (
              <VoiceRecorder onRecorded={(blob) => setVoiceBlob(o.id, blob)} />
            )}
          </div>
        ))}
    </Flow>
  );
}
