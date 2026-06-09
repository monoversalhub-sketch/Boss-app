import { Suspense } from "react";
import AdminShell from "@/components/admin/AdminShell";

export const metadata = {
  title: "BOSS Admin — Mission Control",
  robots: "noindex, nofollow",
};

export default function Layout({ children }) {
  return (
    <Suspense fallback={
      <div style={{height:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"#0A0A0B",color:"#8E8E93",fontSize:14}}>
        Loading…
      </div>
    }>
      <AdminShell>{children}</AdminShell>
    </Suspense>
  );
}
