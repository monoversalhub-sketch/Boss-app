"use client";
import { useState, useRef, useEffect } from "react";
import { C } from "./tokens";

const BAR_STYLE = (i) => ({
  width: 3,
  height: 4,
  borderRadius: 2,
  backgroundColor: C.accent,
  animation: "voiceWave 0.5s ease-in-out infinite",
  animationDelay: `${i * 0.08}s`,
});

export function VoiceNote({ onRecorded, onRemove, existingUrl, toast }) {
  const [state, setState] = useState(existingUrl ? "done" : "idle");
  const [audioUrl, setAudioUrl] = useState(existingUrl || null);
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const audioRef = useRef(null);
  const streamRef = useRef(null);
  const mountedRef = useRef(true);

  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mr = new MediaRecorder(stream);
      mediaRecorderRef.current = mr;
      chunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        if (!mountedRef.current) return;
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        if (blob.size < 100) { toast?.("⚠️ Recording too short — try again"); setState("idle"); stream.getTracks().forEach(t => t.stop()); return; }
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        setState("done");
        const audio = new Audio(url);
        audio.addEventListener("loadedmetadata", () => setDuration(Math.ceil(audio.duration)));
        onRecorded(blob);
        stream.getTracks().forEach(t => t.stop());
      };
      mr.start();
      setState("recording");
    } catch {
      toast?.("⚠️ Microphone access needed to record voice");
      setState("idle");
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
  }

  function togglePlay() {
    if (!audioRef.current) return;
    if (playing) { audioRef.current.pause(); setPlaying(false); return; }
    audioRef.current.play();
    setPlaying(true);
    audioRef.current.addEventListener("ended", () => setPlaying(false), { once: true });
  }

  function handleRemove() {
    if (audioUrl && !existingUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    setState("idle");
    setDuration(0);
    setPlaying(false);
    onRemove?.();
  }

  useEffect(() => {
    return () => {
      mediaRecorderRef.current?.stop();
      streamRef.current?.getTracks().forEach(t => t.stop());
      if (audioUrl && !existingUrl) URL.revokeObjectURL(audioUrl);
    };
  }, []);

  if (state === "recording") {
    return (
      <div style={{
        display: "flex", alignItems: "center", gap: 12,
        padding: "12px 14px", borderRadius: 12,
        backgroundColor: "rgba(255,59,48,0.08)",
        border: "1px solid rgba(255,59,48,0.2)",
      }}>
        <div style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: C.red, animation: "pulse 1s ease-in-out infinite" }} />
        <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 20 }}>
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} style={BAR_STYLE(i)} />
          ))}
        </div>
        <button className="tap" onClick={stopRecording}
          style={{
            marginLeft: "auto", padding: "8px 16px", borderRadius: 10,
            backgroundColor: C.red, color: "#fff", fontWeight: 700,
            fontSize: 13, border: "none", cursor: "pointer", fontFamily: "inherit",
          }}>
          Stop
        </button>
      </div>
    );
  }

  if (state === "done" && audioUrl) {
    return (
      <div style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "10px 14px", borderRadius: 12,
        backgroundColor: C.s2,
      }}>
        <audio ref={audioRef} src={audioUrl} preload="metadata" style={{ display: "none" }} />
        <button className="tap" onClick={togglePlay}
          style={{
            width: 36, height: 36, borderRadius: "50%",
            backgroundColor: C.accent, color: "#fff",
            border: "none", cursor: "pointer", fontSize: 16,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: "inherit", flexShrink: 0,
          }}>
          {playing ? "⏸" : "▶️"}
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.text }}>Voice note</div>
          <div style={{ fontSize: 12, color: C.sub }}>{duration ? `${duration}s` : ""}</div>
        </div>
        {!existingUrl && (
          <button className="tap" onClick={handleRemove}
            style={{
              background: "none", border: "none", fontSize: 16, cursor: "pointer",
              color: C.sub, fontFamily: "inherit", padding: 4,
            }}>
            ✕
          </button>
        )}
      </div>
    );
  }

  return (
    <button className="tap" onClick={startRecording}
      style={{
        width: "100%", padding: "12px 0", borderRadius: 12,
        backgroundColor: C.s3, color: C.text, fontWeight: 700,
        fontSize: 14, border: "none", cursor: "pointer", fontFamily: "inherit",
        display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
      }}>
      🎤 Add Voice Note
    </button>
  );
}
