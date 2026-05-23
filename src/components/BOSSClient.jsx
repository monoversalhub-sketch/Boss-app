"use client";
// src/components/BOSSClient.jsx
// Thin "use client" wrapper — handles SSR + ErrorBoundary at the page level.
// ErrorBoundary MUST be here (outermost), not inside BOSSApp, so that
// any render error in BOSSApp is caught and shows the BOSS recovery screen
// instead of Next.js's white error page.
import dynamic from "next/dynamic";
import { ErrorBoundary } from "./boss/context";

const BOSSApp = dynamic(() => import("./BOSSApp"), { ssr: false });

export default function BOSSClient() {
  return (
    <ErrorBoundary>
      <div style={{ height: "100dvh", overflow: "hidden" }}>
        <BOSSApp />
      </div>
    </ErrorBoundary>
  );
}
