"use client";
// src/components/BOSSClient.jsx
// Thin "use client" wrapper so the main app component can use
// useState / useEffect / localStorage without SSR issues.
import dynamic from "next/dynamic";

const BOSSApp = dynamic(() => import("./BOSSApp"), { ssr: false });

export default function BOSSClient() {
  return (
    <div style={{ height: "100dvh", overflow: "hidden" }}>
      <BOSSApp />
    </div>
  );
}
